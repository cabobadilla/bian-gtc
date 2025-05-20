import streamlit as st
import yaml
import io
import os
from PIL import Image, ImageDraw, ImageFont
import base64
import textwrap
import math
import openai
import re
import json
import tempfile
import subprocess
import threading
import time
import requests
from yaml import safe_load
import uuid

# Configure OpenAI API with a more compatible approach for version 0.28.1
# First try to get from streamlit secrets
api_key = None
try:
    api_key = st.secrets["OPENAI_API_KEY"]
except:
    # Fallback to environment variable
    api_key = os.environ.get("OPENAI_API_KEY")

if not api_key:
    st.error("OpenAI API key not found. Please add it to Streamlit secrets or set the OPENAI_API_KEY environment variable.")
    st.stop()

# Set the API key for openai 0.28.1
openai.api_key = api_key

st.set_page_config(
    page_title="GTC - BIAN Use Case Analyzer",
    page_icon="🏦",
    layout="wide"
)

# Initialize session state for multi-step process
if 'step' not in st.session_state:
    st.session_state.step = 1  # Step 1: Analysis, Step 2: API Testing

if 'api_deployment' not in st.session_state:
    st.session_state.api_deployment = None

if 'generated_apis' not in st.session_state:
    st.session_state.generated_apis = []

if 'current_api' not in st.session_state:
    st.session_state.current_api = None

# Function to move to next step
def next_step():
    st.session_state.step += 1

# Function to go back to previous step
def prev_step():
    if st.session_state.step > 1:
        st.session_state.step -= 1

# Function to extract sections from the analysis
def extract_sections(text):
    """
    Extract different sections from the analysis text.
    """
    sections = {
        "UNDERSTANDING OF THE USE CASE": "",
        "BIAN V12 MAPPING": "",
        "BIAN SEMANTIC APIS": "",
        "RECOMMENDED APIS TO EXPOSE": "",
        "SWAGGER/OPENAPI SPECIFICATION": "",
        "ARCHITECTURE FLOW": ""
    }
    
    # Use regex to find each section and its content
    for section_name in sections.keys():
        # Create patterns that match section headers in different formats
        patterns = [
            # Exact match with a number prefix (e.g., "1. UNDERSTANDING OF THE USE CASE")
            re.compile(rf'(?:\d+\.?\s*)?{re.escape(section_name)}[:\s]*\n(.*?)(?:\n(?:\d+\.?\s*)?[A-Z][A-Z\s/]+[:\s]*\n|\Z)', re.DOTALL | re.IGNORECASE),
            
            # Match with a hash prefix (e.g., "# UNDERSTANDING OF THE USE CASE")
            re.compile(rf'(?:#+\s*)?{re.escape(section_name)}[:\s]*\n(.*?)(?:\n(?:#+\s*)?[A-Z][A-Z\s/]+[:\s]*\n|\Z)', re.DOTALL | re.IGNORECASE),
            
            # Simplified section name match
            re.compile(rf'{re.escape(section_name.split("/")[0] if "/" in section_name else section_name)}[:\s]*\n(.*?)(?:\n(?:\d+\.?\s*)?[A-Z][A-Z\s/]+[:\s]*\n|\Z)', re.DOTALL | re.IGNORECASE)
        ]
        
        # Try each pattern until we find a match
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                sections[section_name] = match.group(1).strip()
                break
    
    return sections

# Function to extract YAML content from text
def extract_yaml(text):
    """
    Extract YAML content from the text.
    """
    # Common patterns for YAML or JSON code blocks
    patterns = [
        # Markdown code block for yaml
        re.compile(r'```ya?ml\s*(.*?)\s*```', re.DOTALL | re.IGNORECASE),
        
        # Markdown code block without language specification
        re.compile(r'```\s*(openapi:\s*.*?)\s*```', re.DOTALL | re.IGNORECASE),
        
        # Indented code block without markdown markers
        re.compile(r'(?:^|\n)(\s{2,}openapi:\s*.*?)(?:\n\S|\Z)', re.DOTALL | re.IGNORECASE)
    ]
    
    for pattern in patterns:
        matches = pattern.findall(text)
        if matches:
            # Return the first valid match
            for match in matches:
                try:
                    # Check if it's valid YAML
                    yaml.safe_load(match)
                    return match
                except:
                    continue
    
    # If we couldn't extract a valid YAML, check if there's any text with OpenAPI structure
    if 'openapi:' in text and ('paths:' in text or 'components:' in text):
        # Try to extract an approximate YAML structure
        try:
            # Find the openapi declaration and start from there
            openapi_match = re.search(r'openapi:\s*["\']?\d+\.\d+\.\d+["\']?.*?(?=\n\S+:|$)', text, re.DOTALL)
            if openapi_match:
                start_pos = openapi_match.start()
                yaml_text = text[start_pos:]
                
                # Try to find where the YAML content ends (next non-YAML section)
                end_markers = ['\n# ', '\n## ', '\n```', '\n1. ', '\n2. ']
                end_positions = [yaml_text.find(marker) for marker in end_markers if yaml_text.find(marker) > 0]
                
                if end_positions:
                    end_pos = min(end_positions)
                    yaml_text = yaml_text[:end_pos]
                
                # Clean up the extracted text
                yaml_text = '\n'.join(line for line in yaml_text.split('\n') if line.strip())
                
                # Validate that it's proper YAML before returning
                try:
                    yaml.safe_load(yaml_text)
                    return yaml_text
                except:
                    pass
        except:
            pass
    
    # If we still don't have valid YAML, try to generate it from the "RECOMMENDED APIS TO EXPOSE" section
    sections = extract_sections(text)
    recommended_apis = sections.get("RECOMMENDED APIS TO EXPOSE", "")
    
    if recommended_apis:
        return generate_openapi_from_recommendations(recommended_apis)
    
    return "# No valid YAML found in the response"

# Function to generate OpenAPI spec from recommended APIs
def generate_openapi_from_recommendations(recommendations_text):
    """
    Generate a valid OpenAPI specification from the recommended APIs section.
    """
    # Extract endpoints using regex - supporting various formats including numbered lists
    endpoint_patterns = [
        re.compile(r'Endpoint:\s*(\/[^\n]*)', re.IGNORECASE),  # Standard format
        re.compile(r'\d+\.\s*Endpoint:\s*(\/[^\n]*)', re.IGNORECASE),  # Numbered list format
        re.compile(r'o\s*Endpoint:\s*(\/[^\n]*)', re.IGNORECASE),  # Bullet point format
        re.compile(r'\n\s*-\s*Endpoint:\s*(\/[^\n]*)', re.IGNORECASE)  # Dash bullet format
    ]
    
    method_patterns = [
        re.compile(r'Method:\s*([A-Z]+)', re.IGNORECASE),  # Standard format
        re.compile(r'o\s*Method:\s*([A-Z]+)', re.IGNORECASE),  # Bullet point format
        re.compile(r'\n\s*-\s*Method:\s*([A-Z]+)', re.IGNORECASE)  # Dash bullet format
    ]
    
    purpose_patterns = [
        re.compile(r'Purpose:\s*([^\n]*)', re.IGNORECASE),  # Standard format
        re.compile(r'o\s*Purpose:\s*([^\n]*)', re.IGNORECASE),  # Bullet point format
        re.compile(r'\n\s*-\s*Purpose:\s*([^\n]*)', re.IGNORECASE)  # Dash bullet format
    ]
    
    security_patterns = [
        re.compile(r'Security:\s*([^\n]*)', re.IGNORECASE),
        re.compile(r'o\s*Security:\s*([^\n]*)', re.IGNORECASE),
        re.compile(r'\n\s*-\s*Security:\s*([^\n]*)', re.IGNORECASE)
    ]
    
    error_handling_patterns = [
        re.compile(r'Error\s*Handling:\s*([^\n]*)', re.IGNORECASE),
        re.compile(r'o\s*Error\s*Handling:\s*([^\n]*)', re.IGNORECASE),
        re.compile(r'\n\s*-\s*Error\s*Handling:\s*([^\n]*)', re.IGNORECASE)
    ]
    
    # Collect all matches from each pattern
    endpoints = []
    for pattern in endpoint_patterns:
        endpoints.extend(pattern.findall(recommendations_text))
    
    methods = []
    for pattern in method_patterns:
        methods.extend(pattern.findall(recommendations_text))
    
    purposes = []
    for pattern in purpose_patterns:
        purposes.extend(pattern.findall(recommendations_text))
    
    security_info = []
    for pattern in security_patterns:
        security_info.extend(pattern.findall(recommendations_text))
    
    error_handling = []
    for pattern in error_handling_patterns:
        error_handling.extend(pattern.findall(recommendations_text))
    
    # Check if we found any endpoints, if not try to extract from numbered list items
    if not endpoints:
        # Try to extract endpoint information from numbered list items
        list_item_pattern = re.compile(r'\d+\.\s*(\/[a-zA-Z0-9\/\-_]+)\s*-\s*([A-Z]+)\s*-\s*([^\n]*)', re.IGNORECASE)
        list_items = list_item_pattern.findall(recommendations_text)
        
        for item in list_items:
            if len(item) >= 3:
                endpoints.append(item[0])
                methods.append(item[1])
                purposes.append(item[2])
    
    # Create a basic OpenAPI spec
    openapi_spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "BIAN Banking API",
            "description": "API generated from BIAN recommendations",
            "version": "1.0.0"
        },
        "servers": [
            {
                "url": "http://localhost:8000",
                "description": "Local development server"
            }
        ],
        "paths": {},
        "components": {
            "schemas": {
                "Error": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "integer",
                            "format": "int32"
                        },
                        "message": {
                            "type": "string"
                        }
                    }
                },
                "ApiResponse": {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "data": {
                            "type": "object"
                        },
                        "message": {
                            "type": "string"
                        }
                    }
                }
            },
            "securitySchemes": {
                "OAuth2": {
                    "type": "oauth2",
                    "flows": {
                        "implicit": {
                            "authorizationUrl": "http://localhost:8000/auth",
                            "scopes": {
                                "read": "Read access",
                                "write": "Write access"
                            }
                        }
                    }
                },
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT"
                }
            }
        }
    }
    
    # Add specific schemas based on endpoints
    if any("loan" in endpoint.lower() for endpoint in endpoints):
        openapi_spec["components"]["schemas"]["LoanApplication"] = {
            "type": "object",
            "properties": {
                "customerId": {
                    "type": "string",
                    "example": "CUST123456"
                },
                "loanAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 10000.00
                },
                "loanPurpose": {
                    "type": "string",
                    "example": "Home renovation"
                },
                "loanTerm": {
                    "type": "integer",
                    "example": 36,
                    "description": "Loan term in months"
                },
                "incomeAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 5000.00
                },
                "employmentDetails": {
                    "type": "object",
                    "properties": {
                        "employer": {
                            "type": "string",
                            "example": "Acme Corp"
                        },
                        "position": {
                            "type": "string",
                            "example": "Software Engineer"
                        },
                        "yearsEmployed": {
                            "type": "integer",
                            "example": 5
                        }
                    }
                },
                "existingObligations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "example": "Credit Card"
                            },
                            "amount": {
                                "type": "number",
                                "format": "float",
                                "example": 2500.00
                            },
                            "monthlyPayment": {
                                "type": "number",
                                "format": "float",
                                "example": 250.00
                            }
                        }
                    }
                }
            },
            "required": ["customerId", "loanAmount", "loanTerm"]
        }
        
        openapi_spec["components"]["schemas"]["LoanOffer"] = {
            "type": "object",
            "properties": {
                "offerId": {
                    "type": "string",
                    "example": "OFFER789012"
                },
                "customerId": {
                    "type": "string",
                    "example": "CUST123456"
                },
                "loanAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 10000.00
                },
                "apr": {
                    "type": "number",
                    "format": "float",
                    "example": 8.5
                },
                "monthlyPayment": {
                    "type": "number",
                    "format": "float",
                    "example": 315.00
                },
                "loanTerm": {
                    "type": "integer",
                    "example": 36,
                    "description": "Loan term in months"
                },
                "offerExpiryDate": {
                    "type": "string",
                    "format": "date",
                    "example": "2023-12-31"
                }
            }
        }
        
        openapi_spec["components"]["schemas"]["LoanProduct"] = {
            "type": "object",
            "properties": {
                "productId": {
                    "type": "string",
                    "example": "PROD123"
                },
                "productName": {
                    "type": "string",
                    "example": "Personal Loan"
                },
                "minAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 1000.00
                },
                "maxAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 50000.00
                },
                "minTerm": {
                    "type": "integer",
                    "example": 12,
                    "description": "Minimum term in months"
                },
                "maxTerm": {
                    "type": "integer",
                    "example": 60,
                    "description": "Maximum term in months"
                },
                "baseRate": {
                    "type": "number",
                    "format": "float",
                    "example": 7.5
                },
                "features": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "example": ["No early repayment fee", "Payment holiday option"]
                },
                "requirements": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "example": ["Minimum income $3000", "Good credit score"]
                }
            }
        }
    
    # Add specific schemas for credit card dispute if mentioned
    if any("dispute" in endpoint.lower() or "creditcard" in endpoint.lower().replace(" ", "") for endpoint in endpoints):
        openapi_spec["components"]["schemas"]["DisputeRequest"] = {
            "type": "object",
            "properties": {
                "customerId": {
                    "type": "string",
                    "example": "CUST123456"
                },
                "accountId": {
                    "type": "string",
                    "example": "ACCT789012"
                },
                "cardId": {
                    "type": "string",
                    "example": "CARD123456"
                },
                "transactionId": {
                    "type": "string",
                    "example": "TXN987654"
                },
                "transactionDate": {
                    "type": "string",
                    "format": "date",
                    "example": "2023-06-15"
                },
                "transactionAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 250.00
                },
                "merchantName": {
                    "type": "string",
                    "example": "Online Store Inc."
                },
                "disputeReason": {
                    "type": "string",
                    "example": "Not authorized",
                    "enum": ["Not authorized", "Item not received", "Duplicate charge", "Incorrect amount", "Other"]
                },
                "disputeDescription": {
                    "type": "string",
                    "example": "I did not make this purchase."
                },
                "attachments": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "format": "binary"
                    },
                    "description": "Supporting documents"
                }
            },
            "required": ["customerId", "accountId", "transactionId", "disputeReason"]
        }
        
        openapi_spec["components"]["schemas"]["DisputeResponse"] = {
            "type": "object",
            "properties": {
                "disputeId": {
                    "type": "string",
                    "example": "DISP123456"
                },
                "status": {
                    "type": "string",
                    "example": "CREATED",
                    "enum": ["CREATED", "UNDER_REVIEW", "PROVISIONAL_CREDIT_APPLIED", "RESOLVED_APPROVED", "RESOLVED_DENIED"]
                },
                "creationDate": {
                    "type": "string",
                    "format": "date-time",
                    "example": "2023-06-16T10:30:00Z"
                },
                "referenceNumber": {
                    "type": "string",
                    "example": "REF987654321"
                },
                "provisionalCreditAmount": {
                    "type": "number",
                    "format": "float",
                    "example": 250.00
                },
                "estimatedResolutionDate": {
                    "type": "string",
                    "format": "date",
                    "example": "2023-07-16"
                }
            }
        }
        
        openapi_spec["components"]["schemas"]["DisputeStatus"] = {
            "type": "object",
            "properties": {
                "disputeId": {
                    "type": "string",
                    "example": "DISP123456"
                },
                "status": {
                    "type": "string",
                    "example": "UNDER_REVIEW",
                    "enum": ["CREATED", "UNDER_REVIEW", "PROVISIONAL_CREDIT_APPLIED", "RESOLVED_APPROVED", "RESOLVED_DENIED"]
                },
                "lastUpdated": {
                    "type": "string",
                    "format": "date-time",
                    "example": "2023-06-18T14:45:00Z"
                },
                "statusDescription": {
                    "type": "string",
                    "example": "Your dispute is currently being investigated."
                },
                "nextSteps": {
                    "type": "string",
                    "example": "We will contact the merchant for more information."
                }
            }
        }
    
    # Add the endpoints to the spec
    for i, endpoint in enumerate(endpoints):
        if i < len(methods):
            method = methods[i].lower()
        else:
            method = "post"  # Default to POST if method not specified
            
        if i < len(purposes):
            description = purposes[i].strip()
        else:
            description = f"API endpoint for {endpoint}"
            
        endpoint_path = endpoint.strip()
        
        # Create a path object if it doesn't exist
        if endpoint_path not in openapi_spec["paths"]:
            openapi_spec["paths"][endpoint_path] = {}
            
        # Add request/response schema based on endpoint name and method
        request_body = None
        responses = {
            "200": {
                "description": "Successful operation",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/ApiResponse"
                        }
                    }
                }
            },
            "400": {
                "description": "Bad request",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Error"
                        }
                    }
                }
            },
            "401": {
                "description": "Unauthorized",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Error"
                        }
                    }
                }
            }
        }
        
        # Determine security based on the security info
        security = []
        if security_info and i < len(security_info):
            sec_info = security_info[i].lower()
            if "oauth" in sec_info:
                security = [{"OAuth2": ["read", "write"]}]
            elif "authentication" in sec_info or "auth" in sec_info:
                security = [{"BearerAuth": []}]
        else:
            # Default to Bearer Auth
            security = [{"BearerAuth": []}]
        
        # Customize request/response based on endpoint
        if "loan" in endpoint_path.lower():
            if "product" in endpoint_path.lower():
                request_body = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "customerId": {
                                        "type": "string",
                                        "example": "CUST123456"
                                    },
                                    "amount": {
                                        "type": "number",
                                        "format": "float",
                                        "example": 10000.00
                                    },
                                    "term": {
                                        "type": "integer",
                                        "example": 36
                                    }
                                }
                            }
                        }
                    },
                    "required": True
                }
                responses["200"]["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "products": {
                            "type": "array",
                            "items": {
                                "$ref": "#/components/schemas/LoanProduct"
                            }
                        }
                    }
                }
            elif "application" in endpoint_path.lower():
                request_body = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/LoanApplication"
                            }
                        }
                    },
                    "required": True
                }
                responses["200"]["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "applicationId": {
                            "type": "string",
                            "example": "APP123456"
                        },
                        "offer": {
                            "$ref": "#/components/schemas/LoanOffer"
                        }
                    }
                }
            elif "offer" in endpoint_path.lower():
                request_body = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "offerId": {
                                        "type": "string",
                                        "example": "OFFER789012"
                                    },
                                    "customerId": {
                                        "type": "string",
                                        "example": "CUST123456"
                                    },
                                    "accepted": {
                                        "type": "boolean",
                                        "example": True
                                    },
                                    "digitalSignature": {
                                        "type": "string",
                                        "example": "SIG12345"
                                    }
                                }
                            }
                        }
                    },
                    "required": True
                }
            elif "funds" in endpoint_path.lower() or "disburs" in endpoint_path.lower():
                request_body = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "loanId": {
                                        "type": "string",
                                        "example": "LOAN123456"
                                    },
                                    "accountId": {
                                        "type": "string",
                                        "example": "ACCT123456"
                                    },
                                    "amount": {
                                        "type": "number",
                                        "format": "float",
                                        "example": 10000.00
                                    }
                                }
                            }
                        }
                    },
                    "required": True
                }
                responses["200"]["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "transactionId": {
                            "type": "string",
                            "example": "TXN123456"
                        },
                        "disbursedAmount": {
                            "type": "number",
                            "format": "float",
                            "example": 10000.00
                        },
                        "accountId": {
                            "type": "string",
                            "example": "ACCT123456"
                        },
                        "disbursementDate": {
                            "type": "string",
                            "format": "date-time",
                            "example": "2023-06-01T10:30:00Z"
                        }
                    }
                }
        elif "dispute" in endpoint_path.lower() or "creditcard" in endpoint_path.lower().replace(" ", ""):
            if method == "post":
                request_body = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/DisputeRequest"
                            }
                        }
                    },
                    "required": True
                }
                responses["200"]["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "dispute": {
                            "$ref": "#/components/schemas/DisputeResponse"
                        }
                    }
                }
            elif method == "get":
                # For GET, assume it's a status lookup
                responses["200"]["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "example": "success"
                        },
                        "dispute": {
                            "$ref": "#/components/schemas/DisputeStatus"
                        }
                    }
                }
        
        # Add the method to the path
        openapi_spec["paths"][endpoint_path][method] = {
            "summary": description,
            "description": description,
            "operationId": f"{method}_{endpoint_path.replace('/', '_').replace('-', '_').replace('{', '').replace('}', '')}",
            "security": security,
            "responses": responses
        }
        
        # Add request body if defined
        if request_body:
            openapi_spec["paths"][endpoint_path][method]["requestBody"] = request_body
    
    # Convert to YAML
    try:
        yaml_content = yaml.dump(openapi_spec, sort_keys=False)
        return yaml_content
    except Exception as e:
        print(f"Error converting OpenAPI spec to YAML: {str(e)}")
        return "# Error generating OpenAPI spec from recommendations"

# Function to extract service domain sequence for architecture diagram
def extract_sequence(text):
    """
    Extract service domains and their sequence from the architecture flow section.
    """
    # Initialize lists for domains and sequence
    domains = []
    sequence = []
    
    # Extract architecture flow section
    sections = extract_sections(text)
    architecture_flow = sections.get("ARCHITECTURE FLOW", "")
    
    if not architecture_flow:
        # Try to find architecture flow information in the raw text
        arch_match = re.search(r'(?:architecture|flow|sequence|interaction).*?(?:\n.*){1,50}', text, re.IGNORECASE)
        if arch_match:
            architecture_flow = arch_match.group(0)
    
    # Extract service domains mentioned
    domain_pattern = re.compile(r'(?:service domain|component)?\s*["\']?([\w\s&-]+?(?:Management|Agreement|Administration|Operations|Processing|Service|Module))["\']?', re.IGNORECASE)
    domain_matches = domain_pattern.findall(architecture_flow)
    
    # Clean up and deduplicate the domain names
    unique_domains = set()
    for match in domain_matches:
        domain = match.strip()
        # Only add if the domain has at least 5 characters and contains domain-like words
        if len(domain) > 5 and any(keyword in domain.lower() for keyword in ['management', 'agreement', 'service', 'processing', 'operations']):
            unique_domains.add(domain)
    
    domains = list(unique_domains)
    
    # If we found less than 2 domains, try to find them in the BIAN mapping section
    if len(domains) < 2:
        bian_mapping = sections.get("BIAN V12 MAPPING", "")
        domain_matches = domain_pattern.findall(bian_mapping)
        
        for match in domain_matches:
            domain = match.strip()
            if len(domain) > 5 and any(keyword in domain.lower() for keyword in ['management', 'agreement', 'service', 'processing', 'operations']):
                unique_domains.add(domain)
        
        domains = list(unique_domains)
    
    # Limit to at most 6 domains for diagram clarity
    domains = domains[:6]
    
    # Extract interaction sequence (or create a simple linear sequence)
    sequence_pattern = re.compile(r'(?:(\d+)[\.\)]\s*(.*?)\s*(?:sends|calls|requests|interacts|processes).*?(to|with)\s*([\w\s&-]+))|(?:([\w\s&-]+).*?(?:sends|calls|requests|interacts|processes).*?(to|with)\s*([\w\s&-]+))', re.IGNORECASE)
    sequence_matches = sequence_pattern.findall(architecture_flow)
    
    if sequence_matches:
        for match in sequence_matches:
            # The match could be in either format, so check both
            if match[0]:  # Numbered step format
                from_domain = match[1].strip()
                to_domain = match[3].strip()
            else:  # Direct mention format
                from_domain = match[4].strip()
                to_domain = match[6].strip()
            
            # Check if these domains are in our domain list
            from_idx = -1
            to_idx = -1
            
            for i, domain in enumerate(domains):
                if from_domain.lower() in domain.lower() or domain.lower() in from_domain.lower():
                    from_idx = i
                if to_domain.lower() in domain.lower() or domain.lower() in to_domain.lower():
                    to_idx = i
            
            if from_idx != -1 and to_idx != -1 and from_idx != to_idx:
                sequence.append((from_idx, to_idx))
    
    # If no sequences found, create a simple linear sequence
    if not sequence and len(domains) > 1:
        for i in range(len(domains)-1):
            sequence.append((i, i+1))
    
    return domains, sequence

# Function to create an architecture diagram
def create_architecture_diagram(domains, sequence):
    """
    Create an architecture diagram showing service domain interactions.
    """
    # Set up dimensions
    width = 1200
    height = 800
    margin = 50
    domain_width = 200
    domain_height = 100
    arrow_size = 15
    
    # Create the image
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to load a font (fallback to default if not available)
    try:
        font_title = ImageFont.truetype("Arial", 14)
        font_text = ImageFont.truetype("Arial", 12)
    except:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()
    
    # Calculate positions for domains
    domain_positions = []
    num_domains = len(domains)
    
    if num_domains <= 2:
        # Two domains horizontally aligned
        positions = [
            (margin + domain_width//2, height//2),
            (width - margin - domain_width//2, height//2)
        ]
        domain_positions = positions[:num_domains]
    
    elif num_domains <= 4:
        # Four domains in a rectangular layout
        positions = [
            (margin + domain_width//2, margin + domain_height//2),  # Top left
            (width - margin - domain_width//2, margin + domain_height//2),  # Top right
            (margin + domain_width//2, height - margin - domain_height//2),  # Bottom left
            (width - margin - domain_width//2, height - margin - domain_height//2)  # Bottom right
        ]
        domain_positions = positions[:num_domains]
    
    else:
        # Circular layout for more domains
        center_x = width // 2
        center_y = height // 2
        radius = min(width, height) // 3
        
        for i in range(num_domains):
            angle = 2 * math.pi * i / num_domains - math.pi / 2  # Start from the top
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            domain_positions.append((x, y))
    
    # Draw domains
    for i, (x, y) in enumerate(domain_positions):
        # Draw domain box
        domain_name = domains[i]
        box_left = x - domain_width // 2
        box_top = y - domain_height // 2
        box_right = x + domain_width // 2
        box_bottom = y + domain_height // 2
        
        # Draw the box with a light blue background
        draw.rectangle([box_left, box_top, box_right, box_bottom], fill=(230, 240, 255), outline=(0, 60, 120), width=2)
        
        # Draw the domain name (with text wrapping)
        wrapped_text = textwrap.wrap(domain_name, width=18)
        text_y = y - (len(wrapped_text) * 15) // 2
        
        for line in wrapped_text:
            text_width = draw.textlength(line, font=font_title)
            draw.text((x - text_width // 2, text_y), line, fill=(0, 0, 0), font=font_title)
            text_y += 15
    
    # Draw connections between domains
    for from_idx, to_idx in sequence:
        if from_idx < len(domain_positions) and to_idx < len(domain_positions):
            from_x, from_y = domain_positions[from_idx]
            to_x, to_y = domain_positions[to_idx]
            
            # Calculate the direction vector
            dir_x = to_x - from_x
            dir_y = to_y - from_y
            length = math.sqrt(dir_x**2 + dir_y**2)
            
            # Normalize the direction vector
            if length > 0:
                dir_x /= length
                dir_y /= length
            
            # Adjust start and end points to be at the domain box edges
            start_x = from_x + dir_x * domain_width // 2
            start_y = from_y + dir_y * domain_height // 2
            end_x = to_x - dir_x * domain_width // 2
            end_y = to_y - dir_y * domain_height // 2
            
            # Draw the line
            draw.line([(start_x, start_y), (end_x, end_y)], fill=(0, 100, 200), width=2)
            
            # Draw arrowhead
            angle = math.atan2(dir_y, dir_x)
            arrow_x1 = end_x - arrow_size * math.cos(angle - math.pi/8)
            arrow_y1 = end_y - arrow_size * math.sin(angle - math.pi/8)
            arrow_x2 = end_x - arrow_size * math.cos(angle + math.pi/8)
            arrow_y2 = end_y - arrow_size * math.sin(angle + math.pi/8)
            
            draw.polygon([(end_x, end_y), (arrow_x1, arrow_y1), (arrow_x2, arrow_y2)], fill=(0, 100, 200))
            
            # Add a midpoint label if available
            if len(sequence) <= 3:  # Only add labels if not too crowded
                mid_x = (start_x + end_x) / 2
                mid_y = (start_y + end_y) / 2 - 10
                
                label = f"call"
                text_width = draw.textlength(label, font=font_text)
                
                # Add a small white background for the text
                text_bg_left = mid_x - text_width // 2 - 2
                text_bg_top = mid_y - 2
                text_bg_right = mid_x + text_width // 2 + 2
                text_bg_bottom = mid_y + 12
                
                draw.rectangle([text_bg_left, text_bg_top, text_bg_right, text_bg_bottom], fill=(255, 255, 255))
                draw.text((mid_x - text_width // 2, mid_y), label, fill=(100, 100, 100), font=font_text)
    
    # Add a title
    title = "BIAN Service Domain Architecture Flow"
    title_width = draw.textlength(title, font=font_title)
    draw.text(((width - title_width) // 2, 10), title, fill=(0, 0, 0), font=font_title)
    
    # Convert the image to a Streamlit-compatible format
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf

# Function to extract endpoints from OpenAPI spec
def extract_endpoints_from_spec(yaml_content):
    """
    Extract endpoints from an OpenAPI specification.
    """
    try:
        # Parse the YAML content
        spec = yaml.safe_load(yaml_content)
        
        # Check if it's a valid OpenAPI spec
        if not spec or 'paths' not in spec:
            return []
        
        endpoints = []
        
        # Process each path
        for path, path_info in spec['paths'].items():
            for method, operation in path_info.items():
                # Skip if not a HTTP method
                if method not in ['get', 'post', 'put', 'delete', 'patch']:
                    continue
                
                endpoint = {
                    'path': path,
                    'method': method.upper(),
                    'summary': operation.get('summary', 'No description'),
                    'operationId': operation.get('operationId', f"{method}_{path.replace('/', '_')}"),
                    'path_params': [],
                    'query_params': [],
                    'sample_body': None
                }
                
                # Extract parameters
                params = operation.get('parameters', [])
                for param in params:
                    if 'name' not in param:
                        continue
                    
                    param_info = {
                        'name': param['name'],
                        'required': param.get('required', False),
                        'example': param.get('example', '')
                    }
                    
                    # If schema has an example, use it
                    if 'schema' in param and 'example' in param['schema']:
                        param_info['example'] = param['schema']['example']
                    
                    # Add to the appropriate parameter list
                    if param.get('in') == 'path':
                        endpoint['path_params'].append(param_info)
                    elif param.get('in') == 'query':
                        endpoint['query_params'].append(param_info)
                
                # Extract request body example if available
                if 'requestBody' in operation and 'content' in operation['requestBody']:
                    content = operation['requestBody']['content']
                    if 'application/json' in content and 'example' in content['application/json']:
                        endpoint['sample_body'] = content['application/json']['example']
                    elif 'application/json' in content and 'schema' in content['application/json']:
                        schema = content['application/json']['schema']
                        if 'example' in schema:
                            endpoint['sample_body'] = schema['example']
                        elif 'examples' in schema and schema['examples']:
                            endpoint['sample_body'] = next(iter(schema['examples'].values()))
                        else:
                            # Create a sample based on the schema properties
                            sample = {}
                            if 'properties' in schema:
                                for prop_name, prop_info in schema['properties'].items():
                                    if 'example' in prop_info:
                                        sample[prop_name] = prop_info['example']
                                    elif 'type' in prop_info:
                                        # Generate a default value based on type
                                        if prop_info['type'] == 'string':
                                            sample[prop_name] = f"sample_{prop_name}"
                                        elif prop_info['type'] == 'integer':
                                            sample[prop_name] = 42
                                        elif prop_info['type'] == 'number':
                                            sample[prop_name] = 3.14
                                        elif prop_info['type'] == 'boolean':
                                            sample[prop_name] = True
                                        elif prop_info['type'] == 'array':
                                            sample[prop_name] = []
                                        elif prop_info['type'] == 'object':
                                            sample[prop_name] = {}
                            endpoint['sample_body'] = sample
                
                endpoints.append(endpoint)
        
        return endpoints
    
    except Exception as e:
        print(f"Error extracting endpoints: {str(e)}")
        return []

# Function to generate FastAPI code from OpenAPI spec
def generate_fastapi_code(yaml_content, api_name):
    """
    Generate FastAPI code from an OpenAPI specification.
    """
    try:
        # Parse the YAML content
        spec = yaml.safe_load(yaml_content)
        
        # Generate the FastAPI code
        code = [
            "from fastapi import FastAPI, Query, Path, Body, HTTPException",
            "from pydantic import BaseModel, Field",
            "from typing import List, Dict, Any, Optional",
            "import uvicorn",
            "from fastapi.middleware.cors import CORSMiddleware",
            "import uuid",
            "import random",
            "import json",
            "from datetime import datetime, date",
            "",
            f"app = FastAPI(title=\"{api_name}\", version=\"1.0.0\")",
            "",
            "# Add CORS middleware",
            "app.add_middleware(",
            "    CORSMiddleware,",
            "    allow_origins=[\"*\"],",
            "    allow_credentials=True,",
            "    allow_methods=[\"*\"],",
            "    allow_headers=[\"*\"],",
            ")",
            "",
            "# Mock database for storing data",
            "db = {}"
        ]
        
        # Add Pydantic models
        models_added = set()
        schemas = {}
        
        # Collect all schemas from components
        if 'components' in spec and 'schemas' in spec['components']:
            schemas = spec['components']['schemas']
        
        # Add model definitions
        for schema_name, schema in schemas.items():
            if schema_name in models_added:
                continue
                
            code.append("")
            code.append(f"class {schema_name}(BaseModel):")
            
            # Add properties
            properties = schema.get('properties', {})
            if not properties:
                code.append("    pass")
                continue
                
            for prop_name, prop_info in properties.items():
                prop_type = prop_info.get('type', 'Any')
                
                # Convert OpenAPI types to Python types
                if prop_type == 'string':
                    py_type = 'str'
                elif prop_type == 'integer':
                    py_type = 'int'
                elif prop_type == 'number':
                    py_type = 'float'
                elif prop_type == 'boolean':
                    py_type = 'bool'
                elif prop_type == 'array':
                    items_type = 'Any'
                    if 'items' in prop_info:
                        items = prop_info['items']
                        if 'type' in items:
                            items_type = items['type']
                            if items_type == 'string':
                                items_type = 'str'
                            elif items_type == 'integer':
                                items_type = 'int'
                            elif items_type == 'number':
                                items_type = 'float'
                            elif items_type == 'boolean':
                                items_type = 'bool'
                        elif '$ref' in items:
                            ref = items['$ref']
                            items_type = ref.split('/')[-1]
                    py_type = f"List[{items_type}]"
                elif prop_type == 'object':
                    py_type = 'Dict'
                else:
                    py_type = 'Any'
                
                # Add the field
                example = prop_info.get('example', '')
                if example:
                    code.append(f"    {prop_name}: {py_type} = Field(None, example=\"{example}\")")
                else:
                    code.append(f"    {prop_name}: {py_type} = None")
            
            models_added.add(schema_name)
        
        # Add endpoints
        if 'paths' in spec:
            for path, path_info in spec['paths'].items():
                # Process each HTTP method
                for method, operation in path_info.items():
                    # Skip if not a HTTP method
                    if method not in ['get', 'post', 'put', 'delete', 'patch']:
                        continue
                        
                    # Get operation details
                    summary = operation.get('summary', f"{method.upper()} {path}")
                    op_id = operation.get('operationId', f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}")
                    
                    # Generate function parameters
                    params = []
                    
                    # Path parameters
                    for param in operation.get('parameters', []):
                        if param.get('in') == 'path':
                            param_name = param['name']
                            param_type = 'str'
                            if 'schema' in param and 'type' in param['schema']:
                                schema_type = param['schema']['type']
                                if schema_type == 'integer':
                                    param_type = 'int'
                                elif schema_type == 'number':
                                    param_type = 'float'
                            
                            param_line = f"{param_name}: {param_type} = Path(...)"
                            params.append(param_line)
                    
                    # Query parameters
                    for param in operation.get('parameters', []):
                        if param.get('in') == 'query':
                            param_name = param['name']
                            param_type = 'str'
                            if 'schema' in param and 'type' in param['schema']:
                                schema_type = param['schema']['type']
                                if schema_type == 'integer':
                                    param_type = 'int'
                                elif schema_type == 'number':
                                    param_type = 'float'
                                elif schema_type == 'boolean':
                                    param_type = 'bool'
                            
                            required = param.get('required', False)
                            if required:
                                param_line = f"{param_name}: {param_type} = Query(...)"
                            else:
                                param_line = f"{param_name}: Optional[{param_type}] = Query(None)"
                            params.append(param_line)
                    
                    # Request body
                    if 'requestBody' in operation and 'content' in operation['requestBody']:
                        content = operation['requestBody']['content']
                        if 'application/json' in content:
                            json_schema = content['application/json']
                            if 'schema' in json_schema:
                                schema = json_schema['schema']
                                if '$ref' in schema:
                                    model_name = schema['$ref'].split('/')[-1]
                                    params.append(f"body: {model_name} = Body(...)")
                                else:
                                    params.append("body: Dict = Body(...)")
                    
                    # Add the endpoint function
                    code.append("")
                    code.append(f"@app.{method}(\"{path}\")")
                    code.append(f"async def {op_id}({', '.join(params)}):")
                    code.append(f"    \"\"\"")
                    code.append(f"    {summary}")
                    code.append(f"    \"\"\"")
                    
                    # Add a mock implementation based on the method
                    if method == 'get':
                        if '{' in path and '}' in path:  # It's a get by ID
                            resource_name = path.split('/')[-2]
                            id_param = path.split('/')[-1].replace('{', '').replace('}', '')
                            code.append(f"    # Mock implementation for GET by ID")
                            code.append(f"    if '{resource_name}' not in db:")
                            code.append(f"        db['{resource_name}'] = []")
                            code.append(f"    ")
                            code.append(f"    # Find the resource by ID")
                            code.append(f"    found = next((item for item in db['{resource_name}'] if item.get('id') == {id_param}), None)")
                            code.append(f"    ")
                            code.append(f"    if not found:")
                            code.append(f"        raise HTTPException(status_code=404, detail=\"{resource_name.title()} not found\")")
                            code.append(f"    ")
                            code.append(f"    return found")
                        else:  # It's a list endpoint
                            resource_name = path.split('/')[-1]
                            if not resource_name:  # Handle root path
                                resource_name = 'items'
                            code.append(f"    # Mock implementation for GET list")
                            code.append(f"    if '{resource_name}' not in db:")
                            code.append(f"        db['{resource_name}'] = []")
                            code.append(f"    ")
                            code.append(f"    return db['{resource_name}']")
                    
                    elif method == 'post':
                        resource_name = path.split('/')[-1]
                        if not resource_name:  # Handle root path
                            resource_name = 'items'
                        code.append(f"    # Mock implementation for POST")
                        code.append(f"    if '{resource_name}' not in db:")
                        code.append(f"        db['{resource_name}'] = []")
                        code.append(f"    ")
                        code.append(f"    # Convert to dict and add an ID")
                        code.append(f"    new_item = body.dict() if hasattr(body, 'dict') else body")
                        code.append(f"    new_item['id'] = str(uuid.uuid4())")
                        code.append(f"    new_item['created_at'] = datetime.now().isoformat()")
                        code.append(f"    ")
                        code.append(f"    db['{resource_name}'].append(new_item)")
                        code.append(f"    ")
                        code.append(f"    return new_item")
                    
                    elif method == 'put':
                        resource_name = path.split('/')[-2]
                        id_param = path.split('/')[-1].replace('{', '').replace('}', '')
                        code.append(f"    # Mock implementation for PUT")
                        code.append(f"    if '{resource_name}' not in db:")
                        code.append(f"        db['{resource_name}'] = []")
                        code.append(f"    ")
                        code.append(f"    # Find the index of the item to update")
                        code.append(f"    index = next((i for i, item in enumerate(db['{resource_name}']) if item.get('id') == {id_param}), -1)")
                        code.append(f"    ")
                        code.append(f"    if index == -1:")
                        code.append(f"        raise HTTPException(status_code=404, detail=\"{resource_name.title()} not found\")")
                        code.append(f"    ")
                        code.append(f"    # Update the item")
                        code.append(f"    updated_item = body.dict() if hasattr(body, 'dict') else body")
                        code.append(f"    updated_item['id'] = {id_param}")
                        code.append(f"    updated_item['updated_at'] = datetime.now().isoformat()")
                        code.append(f"    ")
                        code.append(f"    db['{resource_name}'][index] = updated_item")
                        code.append(f"    ")
                        code.append(f"    return updated_item")
                    
                    elif method == 'delete':
                        resource_name = path.split('/')[-2]
                        id_param = path.split('/')[-1].replace('{', '').replace('}', '')
                        code.append(f"    # Mock implementation for DELETE")
                        code.append(f"    if '{resource_name}' not in db:")
                        code.append(f"        db['{resource_name}'] = []")
                        code.append(f"    ")
                        code.append(f"    # Find the index of the item to delete")
                        code.append(f"    index = next((i for i, item in enumerate(db['{resource_name}']) if item.get('id') == {id_param}), -1)")
                        code.append(f"    ")
                        code.append(f"    if index == -1:")
                        code.append(f"        raise HTTPException(status_code=404, detail=\"{resource_name.title()} not found\")")
                        code.append(f"    ")
                        code.append(f"    # Delete the item")
                        code.append(f"    deleted_item = db['{resource_name}'].pop(index)")
                        code.append(f"    ")
                        code.append(f"    return {{'message': '{resource_name.title()} deleted successfully', 'id': {id_param}}}")
                    
                    else:  # patch and other methods
                        code.append(f"    # Mock implementation")
                        code.append(f"    return {{'message': 'Endpoint implemented', 'method': '{method.upper()}', 'path': '{path}'}}")
        
        # Add the main block for running the app
        code.append("")
        code.append("if __name__ == \"__main__\":")
        code.append("    uvicorn.run(app, host=\"0.0.0.0\", port=8000)")
        
        return "\n".join(code)
    
    except Exception as e:
        print(f"Error generating FastAPI code: {str(e)}")
        return f"# Error generating FastAPI code: {str(e)}"

# Function to deploy API
def deploy_api(api_code, port=8000):
    """
    Deploy an API from generated code.
    """
    try:
        # Create a temporary file for the API code
        api_file = tempfile.NamedTemporaryFile(suffix=".py", delete=False)
        with open(api_file.name, "w") as f:
            f.write(api_code)
        
        # Command to run the API server
        cmd = ["uvicorn", f"{os.path.splitext(os.path.basename(api_file.name))[0]}:app", "--host", "0.0.0.0", "--port", str(port)]
        
        # Start the server in a separate process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.path.dirname(api_file.name)
        )
        
        # Wait a bit for the server to start
        time.sleep(2)
        
        # Check if the process is still running
        if process.poll() is not None:
            # Process has terminated
            return {"error": f"Failed to start API server: {process.stderr.read().decode('utf-8')}"}
        
        # Return deployment info
        return {
            "process": process,
            "file": api_file.name,
            "port": port,
            "url": f"http://localhost:{port}"
        }
    
    except Exception as e:
        return {"error": str(e)}

# Function to stop an API deployment
def stop_api(deployment):
    """
    Stop a running API deployment.
    """
    if not deployment or "process" not in deployment:
        return
    
    try:
        # Kill the process
        deployment["process"].terminate()
        deployment["process"].wait(timeout=5)
        
        # Remove the temporary file
        if "file" in deployment and os.path.exists(deployment["file"]):
            os.unlink(deployment["file"])
    except Exception as e:
        print(f"Error stopping API: {str(e)}")

# Function to test an API endpoint
def test_api_endpoint(url, method, body=None):
    """
    Test an API endpoint with the given method and body.
    """
    try:
        # Prepare the request
        method = method.lower()
        headers = {"Content-Type": "application/json"}
        
        # Measure the response time
        start_time = time.time()
        
        # Send the request
        response = None
        if method == "get":
            response = requests.get(url, headers=headers)
        elif method == "post":
            response = requests.post(url, headers=headers, json=body)
        elif method == "put":
            response = requests.put(url, headers=headers, json=body)
        elif method == "delete":
            response = requests.delete(url, headers=headers)
        elif method == "patch":
            response = requests.patch(url, headers=headers, json=body)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        # Calculate the response time
        response_time = time.time() - start_time
        
        # Prepare the response body
        try:
            response_body = response.json()
        except:
            response_body = response.text
        
        # Return the result
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response_body,
            "time": response_time
        }
    
    except Exception as e:
        return {"error": str(e)}

st.title("BIAN Use Case Analyzer")
st.markdown("This tool analyzes banking use cases and maps them to BIAN Service Domains and APIs.")

# Example use cases for guidance - MORE DETAILED VERSIONS
EXAMPLE_USE_CASES = {
    "Personal Loan Application": """
Personal Loan Application Process:
1. Customer logs into mobile app and navigates to loan products.
2. Customer selects personal loan ($10,000, 36 months).
3. System pre-fills application with customer profile data.
4. Customer provides income ($5,000), employment details, purpose (renovation), and existing obligations.
5. System performs credit check and affordability assessment.
6. System generates loan offer (8.5% APR, $315 monthly, 36 months).
7. Customer accepts terms and digitally signs.
8. Funds are disbursed to customer's account within 24 hours.
9. Loan account created with automatic monthly payment schedule.
    """,
    
    "Credit Card Dispute": """
Credit Card Dispute Handling:
1. Customer identifies unauthorized transaction ($250) in mobile app.
2. Customer submits dispute with reason "Not authorized".
3. System validates dispute eligibility (within 60 days).
4. System creates dispute case with reference number.
5. Fraud detection analyzes transaction patterns.
6. Provisional credit applied to customer's account.
7. Bank investigates by contacting merchant and reviewing logs.
8. Bank determines transaction was fraudulent.
9. Provisional credit is made permanent.
10. Customer is notified of decision.
    """,
    
    "Account Opening": """
Digital Account Opening:
1. Prospect selects "Premium Checking Account" in mobile app.
2. System displays account features and requirements.
3. Customer provides personal information and ID documents.
4. System performs identity verification, KYC, and AML checks.
5. Customer completes questionnaire about income, employment, and expected account use.
6. Customer sets preferences and accepts terms.
7. System generates account number and credentials.
8. Customer makes initial deposit ($2,500).
9. Welcome package prepared with debit card.
10. Account activated after customer receives and activates card.
    """
}

# Function to enhance the use case with necessary details for BIAN mapping
def enhance_use_case(brief_use_case):
    """Use GPT to enhance a brief use case with more detailed information for BIAN mapping"""
    
    # Create a prompt to enhance the use case
    prompt = f"""
    I have a brief banking use case that needs to be enhanced with more details to ensure it can be properly mapped to BIAN (Banking Industry Architecture Network) service domains.

    Original use case:
    {brief_use_case}

    Please enhance this use case by:
    1. Adding a clear title if not present
    2. Structuring it as a step-by-step process
    3. Including relevant banking actors (customer, bank staff, systems)
    4. Specifying the banking services and products involved
    5. Detailing the information flow and data exchanged
    6. Including relevant decision points and business rules
    7. Mentioning any integration with external systems if applicable
    8. Adding context about the customer journey and experience

    The enhanced use case should be comprehensive enough to identify relevant BIAN service domains such as:
    - Customer Agreement
    - Party Reference
    - Customer Offer
    - Product Management
    - Payment Order
    - Customer Credit Rating
    - etc.

    Format the response as a well-structured banking use case only, do not include explanations or notes about your enhancements.
    """
    
    # Call OpenAI to enhance the use case
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a banking business analyst expert in creating detailed use cases for financial services."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=1500
    )
    
    return response.choices[0].message.content

def generate_bian_analysis(use_case):
    """Generate BIAN analysis using OpenAI's GPT model"""
    
    # Create a comprehensive prompt with detailed instructions
    prompt = f"""
    Analyze the following banking use case and provide a comprehensive mapping to BIAN (Banking Industry Architecture Network) V12 framework.
    Map the use case steps to appropriate BIAN Service Domains, identify semantic APIs, and provide a draft OpenAPI specification.

    Banking Use Case:
    {use_case}

    Provide a detailed analysis in the following format:

    1. UNDERSTANDING OF THE USE CASE
    - Provide a business-level understanding of the use case 
    - Identify the main actors involved
    - Summarize the key business events and processes
    - Specify the data entities involved
    - Note any specific business rules

    2. BIAN V12 MAPPING
    - Map each step of the use case to relevant BIAN V12 Service Domains
    - For each Service Domain, identify the specific Service Operation(s) involved
    - Note if the operation is Initiate, Control, Execute, etc.
    - Explain how the Service Domain supports the use case

    3. BIAN SEMANTIC APIS
    - Based on the Service Domains identified, list the BIAN semantic APIs that would be used
    - Specify the operation (POST, GET, PUT, etc.)
    - Include expected request/response patterns
    - Note any reference data requirements

    4. RECOMMENDED APIS TO EXPOSE
    - Recommend a set of REST APIs that should be exposed to support this use case
    - For each API, provide the endpoint, method, and purpose
    - Note any security or access control considerations
    - Suggest appropriate error handling

    5. SWAGGER/OPENAPI SPECIFICATION
    - Provide a draft Swagger/OpenAPI 3.0 specification for the key APIs
    - Include paths, methods, request parameters
    - Define request/response schemas
    - Include example values

    6. ARCHITECTURE FLOW
    - Describe the sequence of interactions between the identified Service Domains
    - Note any external system interactions
    - Specify data flow between components
    - Identify any event notifications or subscriptions

    Ensure the analysis is comprehensive, technically accurate, and aligns with BIAN V12 standards.
    """
    
    # Call OpenAI to analyze the use case
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",  # Using the 16k token model for longer responses
        messages=[
            {"role": "system", "content": "You are a banking solution architect expert in the BIAN (Banking Industry Architecture Network) framework. You specialize in mapping banking use cases to BIAN service domains and designing API specifications."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,  # Lower temperature for more focused responses
        max_tokens=4000  # Reduced from 10000 to stay within model limits
    )
    
    return response.choices[0].message.content

# Main app logic
if st.session_state.step == 1:
    # Step 1: Use Case Analysis
    with st.form("use_case_form"):
        st.subheader("Enter your banking use case")
        
        # Example selector
        example_options = ["No example (custom input)", "Personal Loan Application", "Credit Card Dispute", "Account Opening"]
        selected_example = st.selectbox("Select an example or create your own:", example_options)
        
        if selected_example == "No example (custom input)":
            use_case = st.text_area("Enter your banking use case:", height=200)
        else:
            use_case = st.text_area("Enter your banking use case:", value=EXAMPLE_USE_CASES[selected_example], height=300)
        
        # Add enhancement option
        enhance_option = st.checkbox("Enhance my use case with additional details for better BIAN mapping", value=True)
        
        submit_button = st.form_submit_button("Analyze Use Case")

    if submit_button and use_case:
        with st.spinner("Processing your use case..."):
            try:
                # If enhancement option is selected, enhance the use case first
                if enhance_option and selected_example == "No example (custom input)":
                    with st.status("Enhancing use case details..."):
                        enhanced_use_case = enhance_use_case(use_case)
                        st.write("Use case enhanced with additional details for better BIAN mapping")
                    use_case = enhanced_use_case
                
                # Show the use case being analyzed
                with st.expander("Analyzing this use case", expanded=False):
                    st.markdown(use_case)
                
                with st.status("Analyzing against BIAN framework..."):
                    analysis = generate_bian_analysis(use_case)
                    st.write("Analysis complete")
                    
                    # Debug: Save raw analysis to session state for debugging
                    st.session_state.raw_analysis = analysis
                    
                    # Print response to debug
                    print("RAW RESPONSE START")
                    print(analysis[:500])  # First 500 chars
                    print("...")
                    print(analysis[-500:])  # Last 500 chars
                    print("RAW RESPONSE END")
                
                # Display the analysis in tabs
                tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
                    "Use Case Understanding", 
                    "BIAN Mapping", 
                    "API Recommendations", 
                    "OpenAPI Spec",
                    "Architecture",
                    "Debug"
                ])
                
                # Extract sections with improved parsing
                sections = extract_sections(analysis)
                
                # Debug: Store extracted sections in session state
                st.session_state.extracted_sections = sections
                
                # Utility function to format raw text in case extraction failed
                def format_section_content(tab, section_name, section_content, section_keywords):
                    if section_content:
                        tab.markdown(section_content)
                    else:
                        # Try to find the section in the raw response
                        found_content = False
                        for keyword in section_keywords:
                            if keyword.lower() in analysis.lower():
                                pattern = re.compile(r'(?i).*' + re.escape(keyword.lower()) + r'.*(?:\n.*){1,50}', re.MULTILINE)
                                matches = pattern.findall(analysis.lower())
                                if matches:
                                    tab.warning(f"Section extraction failed, displaying raw text containing '{keyword}'")
                                    raw_text = "\n".join(matches)
                                    tab.text(raw_text)
                                    found_content = True
                                    break
                        
                        if not found_content:
                            tab.error(f"No {section_name} found in the response. Please try with a more detailed use case or select the enhancement option.")
                
                # Tab 1: Use Case Understanding
                with tab1:
                    format_section_content(
                        tab1, 
                        "understanding analysis", 
                        sections["UNDERSTANDING OF THE USE CASE"],
                        ["understanding", "use case", "business objective", "process flow", "actors"]
                    )
                
                # Tab 2: BIAN Mapping
                with tab2:
                    format_section_content(
                        tab2, 
                        "BIAN mapping", 
                        sections["BIAN V12 MAPPING"],
                        ["bian mapping", "service domain", "bian v12", "service domains"]
                    )
                
                # Tab 3: API Recommendations
                with tab3:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        format_section_content(
                            col1, 
                            "BIAN Semantic APIs", 
                            sections["BIAN SEMANTIC APIS"],
                            ["semantic api", "bian api", "standardized api"]
                        )
                    
                    with col2:
                        format_section_content(
                            col2, 
                            "API recommendations", 
                            sections["RECOMMENDED APIS TO EXPOSE"],
                            ["recommended api", "expose api", "solution api"]
                        )
                
                # Tab 4: OpenAPI Spec
                with tab4:
                    # First try to extract from the OpenAPI specification section
                    yaml_from_section = ""
                    if sections["SWAGGER/OPENAPI SPECIFICATION"]:
                        yaml_from_section = extract_yaml(sections["SWAGGER/OPENAPI SPECIFICATION"])
                    
                    # If no valid YAML from section, try to extract from the entire response
                    if not yaml_from_section or yaml_from_section == "# No valid YAML found in the response":
                        yaml_content = extract_yaml(analysis)
                        if yaml_content and yaml_content != "# No valid YAML found in the response":
                            st.info("Generated OpenAPI specification from the recommended APIs")
                        else:
                            # Try to generate from the Recommended APIs section
                            if sections["RECOMMENDED APIS TO EXPOSE"]:
                                yaml_content = generate_openapi_from_recommendations(sections["RECOMMENDED APIS TO EXPOSE"])
                                st.info("Generated OpenAPI specification from the recommended APIs")
                            else:
                                yaml_content = "# No valid OpenAPI specification could be generated"
                                st.error("Could not generate OpenAPI specification. No API recommendations found.")
                    else:
                        yaml_content = yaml_from_section
                        st.success("OpenAPI specification extracted successfully!")
                    
                    # Display the YAML content
                    st.code(yaml_content, language="yaml")
                    
                    # Store the YAML content and show testing button if valid
                    if yaml_content and yaml_content != "# No valid OpenAPI specification could be generated" and yaml_content != "# No valid YAML found in the response":
                        # Store in session state for API testing
                        api_name = f"BIAN API - {time.strftime('%Y%m%d-%H%M%S')}"
                        st.session_state.generated_apis.append({
                            "name": api_name,
                            "yaml": yaml_content,
                            "timestamp": time.time()
                        })
                        
                        # Add a button to proceed to testing
                        st.success("API ready for testing!")
                        if st.button("Test this API"):
                            st.session_state.current_api = len(st.session_state.generated_apis) - 1
                            next_step()
                
                # Tab 5: Architecture
                with tab5:
                    format_section_content(
                        tab5, 
                        "architecture flow", 
                        sections["ARCHITECTURE FLOW"],
                        ["architecture flow", "architecture diagram", "interaction flow", "service domain flow"]
                    )
                    
                    # Extract service domains and sequence for diagram only if we have architecture content
                    if sections["ARCHITECTURE FLOW"]:
                        try:
                            domains, sequence = extract_sequence(analysis)
                            if domains:
                                st.subheader("Architecture Diagram")
                                img_buf = create_architecture_diagram(domains, sequence)
                                st.image(img_buf, caption="Service Domain Interaction Flow")
                        except Exception as e:
                            st.error(f"Error generating diagram: {str(e)}")
                
                # Tab 6: Debug information
                with tab6:
                    st.subheader("Debug Information")
                    st.write("This tab shows raw data for troubleshooting purposes")
                    
                    st.subheader("Section Detection Results")
                    for section_name, content in sections.items():
                        st.write(f"Section: {section_name}")
                        st.write(f"Content found: {'Yes' if content else 'No'}")
                        if not content:
                            st.write("Searching for patterns in raw response:")
                            # Check if the section appears in any form in the raw response
                            section_keywords = section_name.split()
                            for keyword in section_keywords:
                                if keyword.lower() in analysis.lower():
                                    st.write(f"- Found keyword '{keyword}' in raw response")
                    
                    st.subheader("First 500 chars of Raw Response")
                    st.text(analysis[:500] + "...")
                    
                    st.subheader("Last 500 chars of Raw Response")
                    st.text("..." + analysis[-500:])
                    
                    st.subheader("Response Length")
                    st.write(f"Total characters: {len(analysis)}")
                    
                    st.subheader("Full Raw Response")
                    with st.expander("Show Full Response", expanded=False):
                        st.text(analysis)
                
            except Exception as e:
                st.error(f"Error analyzing use case: {str(e)}")
                st.exception(e)
elif st.session_state.step == 2:
    # Step 2: API Testing
    st.subheader("API Testing Interface")
    
    # Create two columns - one for API selection and one for API testing
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.markdown("### Select API to Test")
        
        # List the available API specs
        if st.session_state.generated_apis:
            api_options = [f"{api['name']} ({time.strftime('%H:%M:%S', time.localtime(api['timestamp']))})" for api in st.session_state.generated_apis]
            selected_api_idx = st.selectbox("Available APIs:", 
                                           options=range(len(api_options)),
                                           format_func=lambda i: api_options[i],
                                           index=st.session_state.current_api if st.session_state.current_api is not None else 0)
            
            st.session_state.current_api = selected_api_idx
            current_api = st.session_state.generated_apis[selected_api_idx]
            
            st.markdown("### API Specification")
            with st.expander("View OpenAPI Spec", expanded=False):
                st.code(current_api["yaml"], language="yaml")
            
            # Button to deploy the API
            if st.button("Deploy API for Testing"):
                if st.session_state.api_deployment:
                    # Stop any existing deployment
                    stop_api(st.session_state.api_deployment)
                
                with st.spinner("Deploying API..."):
                    # Generate FastAPI code from the YAML
                    api_code = generate_fastapi_code(current_api["yaml"], current_api["name"])
                    
                    # Deploy the API
                    port = 8000 + selected_api_idx  # Use different ports for different APIs
                    deployment = deploy_api(api_code, port)
                    
                    if "error" in deployment:
                        st.error(f"Failed to deploy API: {deployment['error']}")
                    else:
                        st.session_state.api_deployment = deployment
                        st.success(f"API deployed successfully at http://localhost:{port}")
            
            # Display the documentation link
            if st.session_state.api_deployment:
                port = st.session_state.api_deployment["port"]
                st.markdown(f"API Documentation: [Swagger UI](http://localhost:{port}/docs) | [ReDoc](http://localhost:{port}/redoc)")
                
                # Button to stop the API
                if st.button("Stop API"):
                    stop_api(st.session_state.api_deployment)
                    st.session_state.api_deployment = None
                    st.info("API stopped")
            
            # Go back button
            if st.button("Back to Analysis"):
                # Stop any running API
                if st.session_state.api_deployment:
                    stop_api(st.session_state.api_deployment)
                    st.session_state.api_deployment = None
                prev_step()
        else:
            st.warning("No APIs available for testing. Please analyze a use case first to generate an API specification.")
            
            # Go back button
            if st.button("Back to Analysis"):
                prev_step()
    
    with col2:
        if st.session_state.api_deployment:
            port = st.session_state.api_deployment["port"]
            st.markdown("### API Endpoint Testing")
            
            # Extract endpoints from the OpenAPI spec
            current_api = st.session_state.generated_apis[st.session_state.current_api]
            endpoints = extract_endpoints_from_spec(current_api["yaml"])
            
            if endpoints:
                endpoint_options = [f"{e['method']} {e['path']} - {e['summary']}" for e in endpoints]
                selected_endpoint_idx = st.selectbox("Select Endpoint:", 
                                                   options=range(len(endpoint_options)),
                                                   format_func=lambda i: endpoint_options[i])
                
                selected_endpoint = endpoints[selected_endpoint_idx]
                
                # Display endpoint details
                st.markdown(f"**Method:** {selected_endpoint['method']}")
                st.markdown(f"**Path:** {selected_endpoint['path']}")
                st.markdown(f"**Description:** {selected_endpoint['summary']}")
                
                # Build the URL with path parameters
                url = f"http://localhost:{port}{selected_endpoint['path']}"
                path_params = selected_endpoint.get('path_params', [])
                
                # Handle path parameters
                if path_params:
                    st.markdown("#### Path Parameters")
                    path_param_values = {}
                    
                    for param in path_params:
                        param_name = param['name']
                        default_value = param.get('example', '1')
                        path_param_values[param_name] = st.text_input(f"{param_name}:", value=default_value)
                    
                    # Replace path parameters in URL
                    for param_name, param_value in path_param_values.items():
                        url = url.replace(f"{{{param_name}}}", param_value)
                
                # Handle query parameters
                query_params = selected_endpoint.get('query_params', [])
                if query_params:
                    st.markdown("#### Query Parameters")
                    query_param_values = {}
                    
                    for param in query_params:
                        param_name = param['name']
                        default_value = param.get('example', '')
                        required = param.get('required', False)
                        label = f"{param_name}:" + (" (required)" if required else "")
                        query_param_values[param_name] = st.text_input(label, value=default_value)
                    
                    # Add query parameters to URL
                    query_string = "&".join([f"{k}={v}" for k, v in query_param_values.items() if v])
                    if query_string:
                        url += f"?{query_string}"
                
                # Handle request body
                request_body = {}
                if selected_endpoint['method'] in ['POST', 'PUT', 'PATCH'] and selected_endpoint.get('sample_body'):
                    st.markdown("#### Request Body")
                    
                    # Convert the sample body to a formatted JSON string
                    sample_body_str = json.dumps(selected_endpoint['sample_body'], indent=2)
                    body_str = st.text_area("JSON Body:", value=sample_body_str, height=200)
                    
                    try:
                        request_body = json.loads(body_str)
                    except json.JSONDecodeError:
                        st.error("Invalid JSON in request body")
                        request_body = {}
                
                # Add a button to send the request
                if st.button("Send Request"):
                    with st.spinner("Sending request..."):
                        method = selected_endpoint['method']
                        response = test_api_endpoint(url, method, request_body)
                        
                        if "error" in response:
                            st.error(f"Error: {response['error']}")
                        else:
                            st.markdown("#### Response")
                            st.markdown(f"**Status Code:** {response['status_code']}")
                            st.markdown(f"**Response Time:** {response['time']:.3f} seconds")
                            
                            st.markdown("**Response Headers:**")
                            st.json(response['headers'])
                            
                            st.markdown("**Response Body:**")
                            if isinstance(response['body'], dict) or isinstance(response['body'], list):
                                st.json(response['body'])
                            else:
                                st.code(response['body'])
            else:
                st.warning("No endpoints found in the OpenAPI specification.")
        else:
            st.info("Deploy an API from the left panel to start testing endpoints.")

# Instructions
with st.expander("How to use this app"):
    if st.session_state.step == 1:
        st.markdown("""
        1. Enter your banking use case in the text area or select one of the examples
        2. Choose whether to enhance your use case for better BIAN mapping (recommended)
        3. Click "Analyze Use Case" to process it
        4. View the analysis results in the different tabs:
            - **Use Case Understanding**: Business objectives, actors, events, and process flow
            - **BIAN Mapping**: Relevant BIAN Service Domains and their functions
            - **API Recommendations**: BIAN Semantic APIs and APIs to expose
            - **OpenAPI Spec**: Sample Swagger/OpenAPI specification
            - **Architecture**: Flow of interactions between Service Domains
            - **Debug**: Troubleshooting information if results are incomplete
        5. Click "Test this API" in the OpenAPI Spec tab to move to API testing
        
        **Tip**: Providing detailed use cases with clear steps, actors, and banking processes will result in better BIAN mapping.
        
        **Note**: To use this app in Streamlit Cloud, you need to configure your OpenAI API key in the secrets manager.
        """)
    elif st.session_state.step == 2:
        st.markdown("""
        1. Select an API from the list of generated specifications
        2. Click "Deploy API for Testing" to create a local server with the API
        3. Select an endpoint to test from the dropdown menu
        4. Fill in any required parameters or modify the request body
        5. Click "Send Request" to test the endpoint and view the response
        6. Click "Stop API" when done testing to shut down the server
        7. Click "Back to Analysis" to return to the use case analysis screen
        
        **Note**: The API is deployed locally on your machine and is available only while this app is running.
        
        **Tip**: You can view the API documentation by clicking on the Swagger UI or ReDoc links after deployment.
        """)

# Footer
st.markdown("---")
st.markdown("*Built with Streamlit and OpenAI*") 