"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle, Trash2, Mail, Clock, ExternalLink, Check,
  Loader2, Copy, Code, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  getChatMessages, markChatMessageRead, deleteChatMessage, getWidgetSnippet,
  type ChatMessageItem,
} from "@/server/actions/chat-widget";

export function ChatWidgetManager() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("");
  const [showSnippet, setShowSnippet] = useState(false);

  useEffect(() => {
    Promise.all([getChatMessages(), getWidgetSnippet()]).then(([m, id]) => {
      setMessages(m);
      setOrgId(id);
      setLoading(false);
    });
  }, []);

  async function handleMarkRead(id: string) {
    await markChatMessageRead(id);
    setMessages(messages.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  }

  async function handleDelete(id: string) {
    await deleteChatMessage(id);
    setMessages(messages.filter((m) => m.id !== id));
    toast.success("Messaggio eliminato");
  }

  function copySnippet() {
    const snippet = generateSnippet(orgId);
    navigator.clipboard.writeText(snippet);
    toast.success("Snippet copiato!");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" />
      </div>
    );
  }

  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      {/* Snippet section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Code className="h-4 w-4 text-[var(--crm-primary)]" />
            Widget Chatbot
          </h3>
          <button
            onClick={() => setShowSnippet(!showSnippet)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--crm-primary)] hover:underline"
          >
            {showSnippet ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showSnippet ? "Nascondi" : "Mostra"} snippet
          </button>
        </div>

        <p className="text-xs text-[var(--crm-neutral-400)] mb-3">
          Copia questo codice e incollalo prima della chiusura del tag {"</body>"} nel tuo sito web.
          I visitatori potranno inviarti messaggi che appariranno qui sotto.
        </p>

        {showSnippet && (
          <div className="relative">
            <pre className="p-3 rounded-lg bg-gray-900 text-green-400 text-xs overflow-x-auto whitespace-pre-wrap max-h-64">
              {generateSnippet(orgId)}
            </pre>
            <button
              onClick={copySnippet}
              className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              title="Copia"
            >
              <Copy className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Inbox */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <MessageCircle className="h-4 w-4 text-green-500" />
          Messaggi in arrivo
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unread}
            </span>
          )}
        </h3>

        {messages.length === 0 ? (
          <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
            Nessun messaggio ricevuto. Installa il widget sul tuo sito per iniziare!
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border transition-colors ${
                  msg.isRead
                    ? "border-[var(--crm-neutral-100)] dark:border-white/10"
                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{msg.visitorName}</p>
                      {!msg.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--crm-neutral-400)] mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span>{msg.visitorEmail}</span>
                      <Clock className="h-3 w-3 ml-1" />
                      <span>{new Date(msg.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {msg.page && (
                        <>
                          <ExternalLink className="h-3 w-3 ml-1" />
                          <span className="truncate max-w-[150px]">{msg.page}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-[var(--crm-neutral-700)] dark:text-gray-300 mt-1.5">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!msg.isRead && (
                      <button
                        onClick={() => handleMarkRead(msg.id)}
                        className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5"
                        title="Segna come letto"
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function generateSnippet(orgId: string) {
  return `<!-- Pipely Chat Widget -->
<script>
(function() {
  var PIPELY_ORG = "${orgId}";
  var API_URL = window.location.protocol + "//" + window.location.host + "/api/v1/chat-widget";

  // Create widget styles
  var style = document.createElement("style");
  style.textContent = \`
    #pipely-widget-btn { position:fixed; bottom:20px; right:20px; width:56px; height:56px; border-radius:50%; background:#2563eb; color:#fff; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:9999; display:flex; align-items:center; justify-content:center; transition:transform 0.2s; }
    #pipely-widget-btn:hover { transform:scale(1.1); }
    #pipely-widget-btn svg { width:24px; height:24px; }
    #pipely-chat-box { position:fixed; bottom:88px; right:20px; width:360px; max-height:480px; background:#fff; border-radius:16px; box-shadow:0 8px 30px rgba(0,0,0,0.12); z-index:9999; display:none; flex-direction:column; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
    #pipely-chat-box.open { display:flex; }
    #pipely-chat-header { padding:16px; background:#2563eb; color:#fff; }
    #pipely-chat-header h3 { margin:0; font-size:14px; font-weight:600; }
    #pipely-chat-header p { margin:4px 0 0; font-size:11px; opacity:0.8; }
    #pipely-chat-form { padding:16px; display:flex; flex-direction:column; gap:10px; }
    #pipely-chat-form input, #pipely-chat-form textarea { width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; box-sizing:border-box; }
    #pipely-chat-form textarea { resize:none; height:80px; }
    #pipely-chat-form button { padding:10px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
    #pipely-chat-form button:hover { background:#1d4ed8; }
    #pipely-chat-ok { padding:32px 16px; text-align:center; display:none; }
    #pipely-chat-ok h4 { margin:0 0 4px; font-size:15px; }
    #pipely-chat-ok p { margin:0; font-size:12px; color:#6b7280; }
  \`;
  document.head.appendChild(style);

  // Create elements
  var btn = document.createElement("button");
  btn.id = "pipely-widget-btn";
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(btn);

  var box = document.createElement("div");
  box.id = "pipely-chat-box";
  box.innerHTML = '<div id="pipely-chat-header"><h3>Hai una domanda?</h3><p>Scrivici, ti rispondiamo al più presto</p></div>' +
    '<form id="pipely-chat-form"><input name="name" placeholder="Il tuo nome" required/><input name="email" type="email" placeholder="La tua email" required/><textarea name="message" placeholder="Il tuo messaggio..." required></textarea><button type="submit">Invia messaggio</button></form>' +
    '<div id="pipely-chat-ok"><h4>Messaggio inviato!</h4><p>Ti ricontatteremo presto.</p></div>';
  document.body.appendChild(box);

  btn.onclick = function() { box.classList.toggle("open"); };

  document.getElementById("pipely-chat-form").onsubmit = function(e) {
    e.preventDefault();
    var f = e.target;
    var data = { orgId: PIPELY_ORG, visitorName: f.name.value, visitorEmail: f.email.value, message: f.message.value, page: window.location.href };
    fetch(API_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })
      .then(function() { f.style.display="none"; document.getElementById("pipely-chat-ok").style.display="block"; });
  };
})();
</script>`;
}
