from langgraph.graph import StateGraph, END
from state import ApplicationState
from agents.analyzer import analyzer_node
from agents.writer import writer_node
from agents.scorer import scorer_node


def supervisor_node(state: ApplicationState) -> dict:
    if state.alignment_analysis is None:
        return {"current_agent": "analyzer"}
    elif state.cover_letter is None:
        return {"current_agent": "writer"}
    elif state.score is None:
        return {"current_agent": "scorer"}
    else:
        return {"current_agent": "done", "is_complete": True}


graph = StateGraph(ApplicationState)

graph.add_node("supervisor", supervisor_node)
graph.add_node("analyzer", analyzer_node)
graph.add_node("writer", writer_node)
graph.add_node("scorer", scorer_node)

graph.set_entry_point("supervisor")

graph.add_conditional_edges(
    "supervisor",
    lambda state: state.current_agent,
    {
        "analyzer": "analyzer",
        "writer": "writer",
        "scorer": "scorer",
        "done": END,
    },
)

graph.add_edge("analyzer", "supervisor")
graph.add_edge("writer", "supervisor")
graph.add_edge("scorer", "supervisor")

app = graph.compile()
