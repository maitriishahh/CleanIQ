import os
import json
from groq import Groq

def generate_chat_response(query: str, dataset_summary: dict, chat_history: list = None):
    """
    Generate responses using llama-3.1-8b-instant.
    Ensures context length is respected.
    """
    # Truncate dataset_summary if it's too large to fit in prompt
    summary_str = json.dumps(dataset_summary, indent=2)
    if len(summary_str) > 4000:
        # Keep essential data for context length limit
        essential = {
            "isImage": dataset_summary.get("isImage", False),
            "dqs": dataset_summary.get("dqs"),
            "total_rows": dataset_summary.get("total_rows"),
            "total_images": dataset_summary.get("total_images"),
            "issues": dataset_summary.get("issues"),
            "imputation_reasons": dataset_summary.get("imputation_reasons", {}),
            "recent_cleaning_actions": dataset_summary.get("recent_cleaning_actions", [])
        }
        summary_str = json.dumps(essential, indent=2)

    system_prompt = f"""You are CleanIQ, a multimodal Data Quality Assistant integrated into the user’s dashboard.

Analyze dataset summaries (tabular + image) and explain data cleaning decisions clearly.

Rules:
- Always use only the provided summary. Do not assume or hallucinate.
- If asked WHY an imputation method (Mean, Median, Mode, KNN, Drop) was used:
  • Refer to `imputation_reasons`
  • Explain using both `reasoning` and `reasoning_factors` (e.g., skewness, missing %, outliers)
- For image data:
  • Explain decisions like corrupted image removal, duplicate detection, and valid image retention using available metrics
- Keep responses simple, human-understandable, and practical (no technical jargon overload)
- Limit responses to 150–200 words
- If data is missing, say so clearly (do not make up explanations)

Dataset Summary:
{summary_str}
    Do NOT return raw JSON. Always convert structured data into a clear, human-readable explanation.
    Keep responses friendly, helpful, under 150 words, and always back recommendations dynamically using the provided context summary metrics.
    """

    messages = [{"role": "system", "content": system_prompt}]
    
    if chat_history:
        messages.extend(chat_history)
        
    messages.append({"role": "user", "content": query})

    try:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return "I'm sorry, my GROQ_API_KEY is not set. Please add it to the environment variables."
            
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.5,
            max_tokens=1024,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"I'm sorry, I couldn't connect to my AI brain. (Error: {str(e)})"
