/* static/js/chatbot.js */

document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const typingIndicator = document.getElementById('chat-typing-indicator');

    let isChatOpen = false;

    // Toggle chatbot
    chatbotToggle.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            chatbotWindow.classList.add('open');
            chatbotInput.focus();
            // Scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        } else {
            chatbotWindow.classList.remove('open');
        }
    });

    chatbotClose.addEventListener('click', () => {
        isChatOpen = false;
        chatbotWindow.classList.remove('open');
    });

    // Send message on Enter
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    chatbotSend.addEventListener('click', sendMessage);

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.innerHTML = text;
        
        // Insert before typing indicator
        chatbotMessages.insertBefore(msgDiv, typingIndicator);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    async function sendMessage() {
        const text = chatbotInput.value.trim();
        if (!text) return;

        // Add user message
        appendMessage(text, 'user');
        chatbotInput.value = '';
        chatbotSend.disabled = true;

        // Show typing indicator
        typingIndicator.classList.add('active');
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            
            // Hide typing indicator
            typingIndicator.classList.remove('active');
            chatbotSend.disabled = false;

            if (response.ok) {
                appendMessage(data.response, 'bot');
            } else {
                appendMessage(data.response || "Lỗi kết nối. Vui lòng thử lại sau.", 'bot');
            }
        } catch (error) {
            console.error("Chatbot Error:", error);
            typingIndicator.classList.remove('active');
            chatbotSend.disabled = false;
            appendMessage("Không thể kết nối đến máy chủ.", 'bot');
        }
    }
});
