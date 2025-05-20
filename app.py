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

# Input section with example selector and enhancement option
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

def generate_bian_analysis(use_case):
    """Generate BIAN analysis using OpenAI's GPT model"""
    
    prompt = f"""
    I need you to analyze the following banking use case and provide a structured analysis 
    according to the BIAN (Banking Industry Architecture Network) v12 framework.
    
    USE CASE:
    {use_case}
    
    Please provide the following analysis in a clearly structured format with ALL SIX sections. Each section MUST have content:
    
    1. UNDERSTANDING OF THE USE CASE:
    - Business objectives
    - Involved actors
    - Key events
    - Main process flow
    
    2. BIAN V12 MAPPING:
    - Identify all relevant BIAN Service Domains (SDs) for the use case
    - Include the complete name of each SD (e.g., "Customer Offer SD", "Consumer Loan SD")
    - Provide a brief description of each SD's function
    - Explain how each SD relates to the specific parts of the use case
    
    3. BIAN SEMANTIC APIS:
    - List the standardized APIs corresponding to each identified Service Domain
    - Specify the appropriate endpoint patterns (/SD/behavior/action)
    - Include recommended operations (Initiate, Execute, Request, Retrieve, Notify) for each API
    - Mention the purpose of each API in the context of this use case
    
    4. RECOMMENDED APIS TO EXPOSE:
    - Suggest specific APIs the solution should expose to implement the use case
    - Include operation types, URI patterns, and main parameters for each API
    - Explain how these APIs would be used in the flow of the use case
    
    5. SWAGGER/OPENAPI SPECIFICATION:
    - Provide a YAML block with suggested endpoints for at least one key API
    - Include paths, operations, parameters, and response structures
    - Format it correctly as a valid OpenAPI specification
    
    6. ARCHITECTURE FLOW:
    - Describe the logical sequence of interactions between Service Domains
    - Include the operations that would be called between SDs
    - Explain the data that would flow between the different SDs
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    1. Begin each section with a clear heading like "1. UNDERSTANDING OF THE USE CASE:"
    2. If you don't have enough information, make reasonable banking industry assumptions
    3. YOU MUST PROVIDE CONTENT FOR ALL SIX SECTIONS - do not skip any section
    4. Format the OpenAPI specification as proper YAML within a code block
    
    The BIAN Service Domains should come from the standard BIAN v12 framework, which includes domains like:
    - Party Reference SD
    - Customer Agreement SD
    - Customer Offer SD
    - Consumer Loan SD
    - Current Account SD
    - Payment Order SD
    - Card Authorization SD
    - Fraud Detection SD
    - Customer Credit Rating SD
    - Point of Service SD
    - Product Design SD
    - Customer Product/Service Eligibility SD
    """
    
    # Using the older API style for openai 0.28.1
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",  # Using the larger context model
        messages=[
            {"role": "system", "content": "You are a BIAN architecture expert with deep knowledge of the BIAN v12 framework, Service Domains, and API patterns. You ALWAYS provide complete responses with ALL requested sections."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=4000  # Increasing token limit to ensure complete response
    )
    
    return response.choices[0].message.content

def create_architecture_diagram(services, sequence):
    """Create a simple architecture diagram based on the services and sequence"""
    img_width = 800
    img_height = 600
    img = Image.new('RGB', (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default
    try:
        font = ImageFont.truetype("Arial", 14)
        title_font = ImageFont.truetype("Arial", 18)
    except IOError:
        font = ImageFont.load_default()
        title_font = ImageFont.load_default()
    
    # Draw title
    draw.text((img_width//2 - 120, 20), "Architecture Diagram", fill=(0, 0, 0), font=title_font)
    
    # Draw services as boxes
    box_width = 150
    box_height = 80
    margin = 50
    boxes_per_row = 3
    
    box_positions = {}
    
    for i, service in enumerate(services):
        row = i // boxes_per_row
        col = i % boxes_per_row
        
        x = margin + col * (box_width + margin)
        y = 100 + row * (box_height + margin)
        
        # Draw box
        draw.rectangle([(x, y), (x + box_width, y + box_height)], outline=(0, 0, 0), width=2)
        
        # Draw service name
        lines = textwrap.wrap(service, width=15)
        y_text = y + (box_height - len(lines) * 15) // 2
        for line in lines:
            draw.text((x + box_width//2 - len(line)*4, y_text), line, fill=(0, 0, 0), font=font)
            y_text += 15
            
        # Store position for later use in drawing arrows
        box_positions[service] = (x, y, x + box_width, y + box_height)
    
    # Draw sequence as arrows
    arrow_color = (0, 0, 255)
    for i in range(len(sequence) - 1):
        if sequence[i] in box_positions and sequence[i+1] in box_positions:
            start_box = box_positions[sequence[i]]
            end_box = box_positions[sequence[i+1]]
            
            # Calculate start and end points for the arrow
            start_x = (start_box[0] + start_box[2]) // 2
            start_y = (start_box[1] + start_box[3]) // 2
            end_x = (end_box[0] + end_box[2]) // 2
            end_y = (end_box[1] + end_box[3]) // 2
            
            # Draw the arrow
            draw.line([(start_x, start_y), (end_x, end_y)], fill=arrow_color, width=2)
            
            # Draw arrowhead
            angle = math.atan2(end_y - start_y, end_x - start_x)
            arrow_size = 10
            draw.polygon([
                (end_x - arrow_size * math.cos(angle - math.pi/6), end_y - arrow_size * math.sin(angle - math.pi/6)),
                (end_x, end_y),
                (end_x - arrow_size * math.cos(angle + math.pi/6), end_y - arrow_size * math.sin(angle + math.pi/6))
            ], fill=arrow_color)
    
    # Convert to bytes
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return buf

def render_yaml(yaml_text):
    """Render YAML with proper formatting"""
    return f"""```yaml
{yaml_text}
```"""

def extract_yaml(text):
    """Extract YAML content from the response"""
    if "```yaml" in text and "```" in text.split("```yaml")[1]:
        return text.split("```yaml")[1].split("```")[0].strip()
    elif "```" in text:
        # Try to find any code block that might contain YAML
        blocks = text.split("```")
        for i in range(1, len(blocks), 2):
            if i < len(blocks) and ":" in blocks[i] and "paths" in blocks[i]:
                return blocks[i].strip()
    
    # Fallback: try to extract anything that looks like YAML
    yaml_pattern = r'openapi:.*?paths:.*?components:'
    match = re.search(yaml_pattern, text, re.DOTALL)
    if match:
        return match.group(0)
    
    return "# No valid YAML found in the response"

def extract_sequence(text):
    """Extract service domains and their sequence from the response"""
    # This is a simplified extraction - in a real app you might want to use more 
    # sophisticated parsing based on the actual structure of the response
    domains = []
    sequence = []
    
    if "BIAN V12 MAPPING" in text:
        mapping_section = text.split("BIAN V12 MAPPING")[1].split("BIAN SEMANTIC APIS")[0]
        # Extract service domains from bullet points
        domains = re.findall(r'[-•]\s*(\w+(?:\s+\w+)*)\s*Service\s*Domain', mapping_section)
    
    if "ARCHITECTURE FLOW" in text:
        flow_section = text.split("ARCHITECTURE FLOW")[1]
        # Try to extract sequence - this is simplified and might need to be adapted
        sequence = domains  # In a real implementation, parse the actual sequence
    
    return domains, sequence

def extract_sections(analysis_text):
    """Extract sections from the analysis with improved parsing"""
    sections = {}
    
    # Define section patterns with multiple variations
    section_patterns = {
        "UNDERSTANDING OF THE USE CASE": [
            r"(?i)(?:1\.\s*)?UNDERSTANDING\s+OF\s+THE\s+USE\s+CASE\s*:?",
            r"(?i)(?:1\.\s*)?USE\s+CASE\s+UNDERSTANDING\s*:?"
        ],
        "BIAN V12 MAPPING": [
            r"(?i)(?:2\.\s*)?BIAN\s+V12\s+MAPPING\s*:?",
            r"(?i)(?:2\.\s*)?BIAN\s+MAPPING\s*:?",
            r"(?i)(?:2\.\s*)?MAPPING\s+TO\s+BIAN\s*:?"
        ],
        "BIAN SEMANTIC APIS": [
            r"(?i)(?:3\.\s*)?BIAN\s+SEMANTIC\s+APIS\s*:?",
            r"(?i)(?:3\.\s*)?SEMANTIC\s+APIS\s*:?"
        ],
        "RECOMMENDED APIS TO EXPOSE": [
            r"(?i)(?:4\.\s*)?RECOMMENDED\s+APIS\s+TO\s+EXPOSE\s*:?",
            r"(?i)(?:4\.\s*)?APIS\s+TO\s+EXPOSE\s*:?"
        ],
        "SWAGGER/OPENAPI SPECIFICATION": [
            r"(?i)(?:5\.\s*)?SWAGGER\/OPENAPI\s+SPECIFICATION\s*:?",
            r"(?i)(?:5\.\s*)?OPENAPI\s+SPECIFICATION\s*:?",
            r"(?i)(?:5\.\s*)?SWAGGER\s+SPECIFICATION\s*:?"
        ],
        "ARCHITECTURE FLOW": [
            r"(?i)(?:6\.\s*)?ARCHITECTURE\s+FLOW\s*:?",
            r"(?i)(?:6\.\s*)?FLOW\s+ARCHITECTURE\s*:?",
            r"(?i)(?:6\.\s*)?SERVICE\s+DOMAIN\s+FLOW\s*:?"
        ]
    }
    
    # Initialize sections dict with empty content
    for section_name in section_patterns:
        sections[section_name] = ""
    
    # Split the text into lines
    lines = analysis_text.split('\n')
    
    current_section = None
    section_content = []
    
    for line in lines:
        # Check if this line starts a new section
        new_section_found = False
        for section_name, patterns in section_patterns.items():
            for pattern in patterns:
                if re.match(pattern, line.strip()):
                    # If we were building a previous section, save it
                    if current_section:
                        sections[current_section] = '\n'.join(section_content).strip()
                    
                    # Start a new section
                    current_section = section_name
                    section_content = []
                    new_section_found = True
                    break
            if new_section_found:
                break
        
        # If this line doesn't start a new section, add it to the current section
        if not new_section_found and current_section:
            section_content.append(line)
    
    # Add the last section
    if current_section and section_content:
        sections[current_section] = '\n'.join(section_content).strip()
    
    return sections

# Main app logic
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
            
            # Tab 1: Use Case Understanding
            with tab1:
                if sections["UNDERSTANDING OF THE USE CASE"]:
                    st.markdown(sections["UNDERSTANDING OF THE USE CASE"])
                else:
                    st.error("No understanding analysis found in the response. Please try with a more detailed use case or select the enhancement option.")
            
            # Tab 2: BIAN Mapping
            with tab2:
                if sections["BIAN V12 MAPPING"]:
                    st.markdown(sections["BIAN V12 MAPPING"])
                else:
                    st.error("No BIAN mapping found in the response. Please try with a more detailed use case.")
            
            # Tab 3: API Recommendations
            with tab3:
                col1, col2 = st.columns(2)
                
                with col1:
                    if sections["BIAN SEMANTIC APIS"]:
                        st.subheader("BIAN Semantic APIs")
                        st.markdown(sections["BIAN SEMANTIC APIS"])
                    else:
                        st.error("No BIAN Semantic APIs found in the response.")
                
                with col2:
                    if sections["RECOMMENDED APIS TO EXPOSE"]:
                        st.subheader("Recommended APIs to Expose")
                        st.markdown(sections["RECOMMENDED APIS TO EXPOSE"])
                    else:
                        st.error("No API recommendations found in the response.")
            
            # Tab 4: OpenAPI Spec
            with tab4:
                if sections["SWAGGER/OPENAPI SPECIFICATION"]:
                    yaml_content = extract_yaml(sections["SWAGGER/OPENAPI SPECIFICATION"])
                    st.code(yaml_content, language="yaml")
                else:
                    st.error("No OpenAPI specification found in the response.")
            
            # Tab 5: Architecture
            with tab5:
                if sections["ARCHITECTURE FLOW"]:
                    st.markdown(sections["ARCHITECTURE FLOW"])
                    
                    # Extract service domains and sequence for diagram
                    try:
                        domains, sequence = extract_sequence(analysis)
                        if domains:
                            st.subheader("Architecture Diagram")
                            img_buf = create_architecture_diagram(domains, sequence)
                            st.image(img_buf, caption="Service Domain Interaction Flow")
                    except Exception as e:
                        st.error(f"Error generating diagram: {str(e)}")
                else:
                    st.error("No architecture flow found in the response.")
            
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
                
                st.subheader("Response Length")
                st.write(f"Total characters: {len(analysis)}")
                
        except Exception as e:
            st.error(f"Error analyzing use case: {str(e)}")
            st.exception(e)
    
# Instructions
with st.expander("How to use this app"):
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
    
    **Tip**: Providing detailed use cases with clear steps, actors, and banking processes will result in better BIAN mapping.
    
    **Note**: To use this app in Streamlit Cloud, you need to configure your OpenAI API key in the secrets manager.
    """)

# Footer
st.markdown("---")
st.markdown("*Built with Streamlit and OpenAI*") 