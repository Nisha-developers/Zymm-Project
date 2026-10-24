from channels.db import database_sync_to_async
from .models import Conversation, Message


@database_sync_to_async
def save_turn(client_id, conversation_id, user_text, reply, ui_results):
    conv = Conversation.objects.filter(id=conversation_id, client_id=client_id).first() if conversation_id else None
    conv = conv or Conversation.objects.create(client_id=client_id, title=user_text[:80])
    Message.objects.create(conversation=conv, role="user", text=user_text)
    Message.objects.create(conversation=conv, role="assistant", text=reply, tool_result=ui_results or None)
    conv.save(update_fields=["updated_at"])
    return conv.id
