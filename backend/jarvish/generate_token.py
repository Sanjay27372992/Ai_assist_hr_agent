from livekit.api import AccessToken, VideoGrants
from dotenv import load_dotenv
import os

load_dotenv(".env.local")

token = AccessToken(
    os.getenv("LIVEKIT_API_KEY"),
    os.getenv("LIVEKIT_API_SECRET"),
)

token.with_identity("frontend-user")
token.with_name("Frontend User")

token.with_grants(
    VideoGrants(
        room_join=True,
        room="jarvis-room",
    )
)

print("\nTOKEN:\n")
print(token.to_jwt())