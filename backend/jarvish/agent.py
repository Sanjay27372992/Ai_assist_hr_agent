from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, AgentServer, JobContext

from prompt import AGENT_INSTRUCTION

from livekit.plugins import google

load_dotenv(".env.local")


# ✅ MUST KEEP THIS
class Assistant(Agent):
    def __init__(self):
        super().__init__(
            instructions=AGENT_INSTRUCTION
        )


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):

    session = AgentSession(
    llm=google.realtime.RealtimeModel(
        voice="Zephyr",  
        temperature=0.7,
        instructions=AGENT_INSTRUCTION,
    ),
)

    await session.start(
        room=ctx.room,
        agent=Assistant(),   
    )

if __name__ == "__main__":
    agents.cli.run_app(server)