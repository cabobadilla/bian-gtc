# BIAN Use Case Analyzer

A Streamlit application that analyzes banking use cases and maps them to BIAN (Banking Industry Architecture Network) Service Domains and APIs using OpenAI's GPT model.

## Features

- Analyze banking use cases and map them to BIAN v12 capabilities
- Identify relevant BIAN Service Domains for the use case
- Suggest standardized BIAN Semantic APIs
- Recommend APIs to expose for the solution
- Generate initial Swagger/OpenAPI specifications
- Create architecture diagrams and flow descriptions

## How to Run Locally

1. Clone this repository
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.streamlit/secrets.toml` file with your OpenAI API key:
   ```
   OPENAI_API_KEY = "your-openai-api-key-here"
   ```
4. Run the Streamlit app:
   ```
   streamlit run app.py
   ```

## Deploying to Streamlit Cloud

1. Fork this repository to your GitHub account
2. Create a new app on [Streamlit Cloud](https://streamlit.io/cloud)
3. Connect your GitHub repository
4. In the Streamlit Cloud dashboard, add your OpenAI API key as a secret:
   - Navigate to your app settings
   - Under "Secrets", add the following:
     ```
     OPENAI_API_KEY = "your-openai-api-key-here"
     ```
5. Deploy the app

## Usage

1. Enter your banking use case in the text area
2. Click "Analyze Use Case" to process it
3. View the analysis results in the different tabs:
   - **Use Case Understanding**: Business objectives, actors, events, and process flow
   - **BIAN Mapping**: Relevant BIAN Service Domains and their functions
   - **API Recommendations**: BIAN Semantic APIs and APIs to expose
   - **OpenAPI Spec**: Sample Swagger/OpenAPI specification
   - **Architecture**: Flow of interactions between Service Domains

## Technologies Used

- Streamlit
- OpenAI API (GPT-3.5-turbo)
- Python Imaging Library (PIL)
- PyYAML 