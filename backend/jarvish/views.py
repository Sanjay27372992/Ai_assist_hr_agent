from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv(".env.local")

# We will initialize the client inside the view function to ensure env vars are loaded.

@csrf_exempt
@require_http_methods(["POST"])
def jarvish_ask(request):
    try:
        body = json.loads(request.body)
        question = body.get("question", "").strip()

        if not question:
            return JsonResponse({"error": "Question is required"}, status=400)

        # Get context from the database
        from .db_context import get_db_context
        db_context = get_db_context(question)
        
        # Get the AI Persona Instruction
        from .prompt import AGENT_INSTRUCTION

        # Build the full prompt for Groq
        prompt = f"""{AGENT_INSTRUCTION}

=== DATABASE CONTEXT ===
{db_context}
========================

User question: {question}
"""
        
        # Call the Groq model
        # Re-load env just in case, and initialize client
        load_dotenv(".env.local")
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            return JsonResponse({"error": "GROQ_API_KEY not found in environment."}, status=500)
            
        client = Groq(api_key=groq_api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
        )

        return JsonResponse({"answer": chat_completion.choices[0].message.content})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)