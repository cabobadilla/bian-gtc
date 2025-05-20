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
                    if sections["SWAGGER/OPENAPI SPECIFICATION"]:
                        yaml_content = extract_yaml(sections["SWAGGER/OPENAPI SPECIFICATION"])
                        st.code(yaml_content, language="yaml")
                        
                        # Store the YAML content in session state for API testing
                        if yaml_content and yaml_content != "# No valid YAML found in the response":
                            api_name = f"BIAN API - {time.strftime('%Y%m%d-%H%M%S')}"
                            st.session_state.generated_apis.append({
                                "name": api_name,
                                "yaml": yaml_content,
                                "timestamp": time.time()
                            })
                            
                            # Add a button to proceed to testing
                            st.success("OpenAPI specification generated successfully!")
                            if st.button("Test this API"):
                                st.session_state.current_api = len(st.session_state.generated_apis) - 1
                                next_step()
                    else:
                        # Try to extract YAML directly from the full response
                        yaml_content = extract_yaml(analysis)
                        if yaml_content and yaml_content != "# No valid YAML found in the response":
                            st.warning("Section extraction failed, but found OpenAPI specification in raw response")
                            st.code(yaml_content, language="yaml")
                            
                            # Store the YAML content in session state for API testing
                            api_name = f"BIAN API - {time.strftime('%Y%m%d-%H%M%S')}"
                            st.session_state.generated_apis.append({
                                "name": api_name,
                                "yaml": yaml_content,
                                "timestamp": time.time()
                            })
                            
                            # Add a button to proceed to testing
                            st.success("OpenAPI specification extracted from response!")
                            if st.button("Test this API"):
                                st.session_state.current_api = len(st.session_state.generated_apis) - 1
                                next_step()
                        else:
                            st.error("No OpenAPI specification found in the response.")
                
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