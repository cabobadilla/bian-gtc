import streamlit as st
import yaml
import io
from PIL import Image, ImageDraw, ImageFont
import base64
import textwrap
import math
from openai import OpenAI

# Configure OpenAI API with the new client
client = OpenAI(api_key=st.secrets["openai"]["api_key"])

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
    
    Please provide the following analysis:
    
    1. UNDERSTANDING OF THE USE CASE:
    - Business objectives
    - Involved actors
    - Key events
    - Main process flow
    
    2. BIAN V12 MAPPING:
    - Identify relevant BIAN Service Domains (SDs)
    - Brief description of each SD's function
    
    3. BIAN SEMANTIC APIS:
    - Standardized APIs corresponding to identified Service Domains
    - Appropriate endpoints and operations (Initiate, Retrieve, Execute, Notify, etc.)
    
    4. RECOMMENDED APIS TO EXPOSE:
    - APIs the solution should expose
    - Operation types, endpoint structures, and main parameters
    
    5. SWAGGER/OPENAPI SPECIFICATION:
    - YAML block with suggested endpoints (simple example)
    
    6. ARCHITECTURE FLOW:
    - Logical sequence of interactions between Service Domains
    
    Provide the response in a well-structured format with clear headings and sections.
    For the Swagger/OpenAPI specification, ensure it's properly formatted as YAML.
    """
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a BIAN architecture expert helping analyze banking use cases."},
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
    import re
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
        import re
        domains = re.findall(r'[-•]\s*(\w+(?:\s+\w+)*)\s*Service\s*Domain', mapping_section)
    
    if "ARCHITECTURE FLOW" in text:
        flow_section = text.split("ARCHITECTURE FLOW")[1]
        # Try to extract sequence - this is simplified and might need to be adapted
        sequence = domains  # In a real implementation, parse the actual sequence
    
    return domains, sequence

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
            
            # Use regex or string splitting to separate sections
            sections = {}
            current_section = None
            
            for line in analysis.split('\n'):
                if line.strip().upper() in [
                    "UNDERSTANDING OF THE USE CASE:", "1. UNDERSTANDING OF THE USE CASE:",
                    "BIAN V12 MAPPING:", "2. BIAN V12 MAPPING:", 
                    "BIAN SEMANTIC APIS:", "3. BIAN SEMANTIC APIS:",
                    "RECOMMENDED APIS TO EXPOSE:", "4. RECOMMENDED APIS TO EXPOSE:",
                    "SWAGGER/OPENAPI SPECIFICATION:", "5. SWAGGER/OPENAPI SPECIFICATION:",
                    "ARCHITECTURE FLOW:", "6. ARCHITECTURE FLOW:"
                ]:
                    current_section = line.strip().upper().replace("1. ", "").replace("2. ", "").replace("3. ", "").replace("4. ", "").replace("5. ", "").replace("6. ", "").rstrip(":")
                    sections[current_section] = []
                elif current_section:
                    sections[current_section].append(line)
            
            # Process sections into formatted content
            for section, content in sections.items():
                sections[section] = "\n".join(content).strip()
            
            # Tab 1: Use Case Understanding
            with tab1:
                if "UNDERSTANDING OF THE USE CASE" in sections:
                    st.markdown(sections["UNDERSTANDING OF THE USE CASE"])
                else:
                    st.write("No understanding analysis found in the response.")
            
            # Tab 2: BIAN Mapping
            with tab2:
                if "BIAN V12 MAPPING" in sections:
                    st.markdown(sections["BIAN V12 MAPPING"])
                else:
                    st.write("No BIAN mapping found in the response.")
            
            # Tab 3: API Recommendations
            with tab3:
                col1, col2 = st.columns(2)
                
                with col1:
                    if "BIAN SEMANTIC APIS" in sections:
                        st.subheader("BIAN Semantic APIs")
                        st.markdown(sections["BIAN SEMANTIC APIS"])
                    else:
                        st.write("No BIAN Semantic APIs found in the response.")
                
                with col2:
                    if "RECOMMENDED APIS TO EXPOSE" in sections:
                        st.subheader("Recommended APIs to Expose")
                        st.markdown(sections["RECOMMENDED APIS TO EXPOSE"])
                    else:
                        st.write("No API recommendations found in the response.")
            
            # Tab 4: OpenAPI Spec
            with tab4:
                if "SWAGGER/OPENAPI SPECIFICATION" in sections:
                    yaml_content = extract_yaml(sections["SWAGGER/OPENAPI SPECIFICATION"])
                    st.code(yaml_content, language="yaml")
                else:
                    st.write("No OpenAPI specification found in the response.")
            
            # Tab 5: Architecture
            with tab5:
                if "ARCHITECTURE FLOW" in sections:
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