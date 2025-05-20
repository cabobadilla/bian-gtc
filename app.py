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

1. Customer logs into the bank's mobile app using their credentials and navigates to the loan products section.
2. System displays various loan options including personal loans, mortgages, and auto loans.
3. Customer selects a personal loan product and enters their desired loan amount ($10,000) and preferred term (36 months).
4. System pre-fills the application form with the customer's existing information from their profile (name, address, contact details, ID number).
5. Customer provides additional required information:
   - Monthly income: $5,000
   - Employment details: Company name, position, years employed
   - Purpose of loan: Home renovation
   - Existing financial obligations: Other loans, credit cards
6. System performs real-time credit check by calling the credit bureau service and calculates affordability based on income vs. expenses ratio.
7. Based on the customer's credit score (720) and affordability assessment, the system generates a loan offer with:
   - Interest rate: 8.5% APR
   - Monthly payment: $315
   - Term: 36 months
   - Total repayment amount: $11,340
8. Customer reviews all terms and conditions and accepts the offer by clicking "Accept".
9. System generates a digital loan agreement that requires customer's electronic signature.
10. Customer digitally signs the agreement using a one-time password sent to their registered mobile number.
11. Loan servicing system processes the application and initiates the disbursement workflow.
12. Funds are disbursed to the customer's designated checking account within 24 hours.
13. Loan account is created in the core banking system with repayment schedule.
14. Customer receives confirmation notification with loan details and first payment date.
15. Repayment schedule is established with automatic monthly debits from customer's checking account.
    """,
    
    "Credit Card Dispute": """
Credit Card Dispute Handling Process:

1. Customer logs into their mobile banking app and reviews their credit card statement.
2. Customer identifies an unauthorized transaction for $250 at an online merchant they don't recognize.
3. Customer navigates to the "Dispute Transaction" feature in the app and selects the specific transaction.
4. Customer provides reason for dispute: "I did not authorize this transaction" and provides additional details: "I have never shopped at this merchant."
5. System validates the dispute eligibility based on:
   - Transaction date (within 60 days)
   - Transaction type (eligible for dispute)
   - Customer's dispute history (no previous suspicious patterns)
6. System creates a dispute case in the Card Dispute Management System with a unique reference number (DIS-2023-45678).
7. Fraud Detection System analyzes the transaction using AI algorithms to check for:
   - Transaction pattern anomalies
   - Geographical irregularities
   - Merchant risk profile
8. Based on initial fraud assessment, a provisional credit of $250 is applied to the customer's account within 24 hours.
9. Customer receives notification confirming the dispute has been registered and provisional credit applied.
10. Bank's dispute resolution team initiates investigation by:
    - Contacting the merchant for transaction evidence
    - Requesting additional information from the card network (Visa/Mastercard)
    - Reviewing transaction logs and authorization data
11. Merchant responds with transaction evidence including IP address, shipping address, and purchase details.
12. Bank compares evidence against customer information and determines the transaction was indeed fraudulent.
13. Dispute resolution team makes final decision: "Dispute approved in favor of customer".
14. The provisional credit is made permanent in the customer's account.
15. Customer is notified of the decision via app notification, email, and SMS.
16. Case is documented in the compliance system for regulatory reporting.
17. Fraud pattern is logged in the fraud detection database to improve future fraud prevention.
    """,
    
    "Account Opening": """
Digital Account Opening Process:

1. Prospect downloads the bank's mobile app from the App Store/Google Play Store and launches it.
2. System presents various banking products and services available to new customers.
3. Prospect selects "Open New Account" and chooses "Premium Checking Account" from the account options.
4. System displays the account features, benefits, fees, and requirements:
   - Monthly fee: $25 (waived with $5,000 minimum balance)
   - Interest rate: 0.25% APY
   - Unlimited transactions
   - Premium debit card with rewards
   - Free international wire transfers
5. Prospect confirms interest in proceeding with application.
6. System creates a new customer profile and requests personal information:
   - Full legal name: John Michael Smith
   - Date of birth: 05/12/1985
   - Social Security Number: XXX-XX-1234
   - Address: 123 Main Street, Apt 4B, New York, NY 10001
   - Email: john.smith@email.com
   - Phone: (212) 555-7890
7. Prospect uploads identification documents through the app:
   - Driver's license (front and back)
   - Utility bill for address verification
8. System performs real-time identity verification using:
   - Document authentication (checking for security features)
   - Facial recognition (comparing selfie to ID photo)
   - Liveness detection (ensuring the person is physically present)
9. Know Your Customer (KYC) checks are performed:
   - Identity verification against government databases
   - OFAC sanctions screening
   - PEP (Politically Exposed Person) screening
10. Anti-Money Laundering (AML) risk assessment is conducted based on:
    - Customer risk profile
    - Geographic risk
    - Transaction risk
11. Customer completes a questionnaire about:
    - Employment status: Full-time employee at ABC Corporation
    - Income range: $75,000-$100,000 annually
    - Source of funds: Salary
    - Expected account activity: Direct deposit, bill payments, daily purchases
12. System performs credit check with customer's authorization.
13. Customer selects account preferences:
    - Paper or electronic statements (selects electronic)
    - Overdraft protection options (opts in)
    - Debit card design (selects premium design)
14. Customer reviews and accepts terms and conditions and privacy policy by checking boxes and providing electronic signature.
15. System generates a new account number: 123456789012
16. Customer sets up online banking credentials:
    - Username
    - Password
    - Security questions
    - Biometric authentication
17. Customer makes initial deposit of $2,500 via:
    - ACH transfer from external bank
    - Debit card
    - Mobile check deposit
18. System generates and displays account opening confirmation with account details.
19. Welcome package is prepared for shipping to customer's address, including:
    - Personalized debit card
    - Checkbook (if requested)
    - Welcome letter
20. Customer receives follow-up communication:
    - Email confirmation
    - Mobile app notification
    - SMS with activation instructions for debit card
21. Account is fully activated after customer receives and activates debit card.
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