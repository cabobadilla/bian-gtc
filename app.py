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

# Input section
with st.form("use_case_form"):
    use_case = st.text_area("Enter your banking use case:", height=200)
    submit_button = st.form_submit_button("Analyze Use Case")

def generate_bian_analysis(use_case):
    """Generate BIAN analysis using OpenAI's GPT model"""
    
    prompt = f"""
    I need you to analyze the following banking use case and provide a structured analysis 
    according to the BIAN (Banking Industry Architecture Network) v12 framework.
    
    USE CASE:
    {use_case}
    
    Please provide the following analysis, being as specific and detailed as possible:
    
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
    
    Use clear section headings and proper formatting. For any section where there isn't enough information, provide recommendations based on BIAN best practices.
    
    The BIAN Service Domains should come from the standard BIAN v12 framework, which includes domains like:
    - Party Reference
    - Customer Agreement
    - Customer Offer
    - Consumer Loan
    - Current Account
    - Payment Order
    - Card Authorization
    - Fraud Detection
    - Customer Credit Rating
    - Point of Service
    - Product Design
    - Customer Product/Service Eligibility
    
    For the Swagger/OpenAPI specification, ensure it's properly formatted as valid YAML.
    """
    
    # Using the older API style for openai 0.28.1
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a BIAN architecture expert with deep knowledge of the BIAN v12 framework, Service Domains, and API patterns."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=2500
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
    with st.spinner("Analyzing your use case..."):
        try:
            analysis = generate_bian_analysis(use_case)
            
            # Display the analysis in tabs
            tab1, tab2, tab3, tab4, tab5 = st.tabs([
                "Use Case Understanding", 
                "BIAN Mapping", 
                "API Recommendations", 
                "OpenAPI Spec",
                "Architecture"
            ])
            
            # Extract sections with improved parsing
            sections = extract_sections(analysis)
            
            # Tab 1: Use Case Understanding
            with tab1:
                if sections["UNDERSTANDING OF THE USE CASE"]:
                    st.markdown(sections["UNDERSTANDING OF THE USE CASE"])
                else:
                    st.write("No understanding analysis found in the response.")
            
            # Tab 2: BIAN Mapping
            with tab2:
                if sections["BIAN V12 MAPPING"]:
                    st.markdown(sections["BIAN V12 MAPPING"])
                else:
                    st.write("No BIAN mapping found in the response.")
            
            # Tab 3: API Recommendations
            with tab3:
                col1, col2 = st.columns(2)
                
                with col1:
                    if sections["BIAN SEMANTIC APIS"]:
                        st.subheader("BIAN Semantic APIs")
                        st.markdown(sections["BIAN SEMANTIC APIS"])
                    else:
                        st.write("No BIAN Semantic APIs found in the response.")
                
                with col2:
                    if sections["RECOMMENDED APIS TO EXPOSE"]:
                        st.subheader("Recommended APIs to Expose")
                        st.markdown(sections["RECOMMENDED APIS TO EXPOSE"])
                    else:
                        st.write("No API recommendations found in the response.")
            
            # Tab 4: OpenAPI Spec
            with tab4:
                if sections["SWAGGER/OPENAPI SPECIFICATION"]:
                    yaml_content = extract_yaml(sections["SWAGGER/OPENAPI SPECIFICATION"])
                    st.code(yaml_content, language="yaml")
                else:
                    st.write("No OpenAPI specification found in the response.")
            
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
                    st.write("No architecture flow found in the response.")
            
        except Exception as e:
            st.error(f"Error analyzing use case: {str(e)}")
    
# Instructions
with st.expander("How to use this app"):
    st.markdown("""
    1. Enter your banking use case in the text area
    2. Click "Analyze Use Case" to process it
    3. View the analysis results in the different tabs:
        - **Use Case Understanding**: Business objectives, actors, events, and process flow
        - **BIAN Mapping**: Relevant BIAN Service Domains and their functions
        - **API Recommendations**: BIAN Semantic APIs and APIs to expose
        - **OpenAPI Spec**: Sample Swagger/OpenAPI specification
        - **Architecture**: Flow of interactions between Service Domains
    
    **Note**: To use this app in Streamlit Cloud, you need to configure your OpenAI API key in the secrets manager.
    """)

# Footer
st.markdown("---")
st.markdown("*Built with Streamlit and OpenAI*") 