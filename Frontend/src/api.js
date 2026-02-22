import axios from 'axios';

const VITE_API_URL = 'http://127.0.0.1:8000';

export const analyzeStock = async (ticker) => {
  try {
    const response = await axios.get(`${VITE_API_URL}/api/analyze/${ticker}`);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
};

export const askChatbot = async (ticker, question, contextData) => {
  try {
    const response = await axios.post(`${VITE_API_URL}/api/chat`, {
      ticker,
      question,
      context_data: contextData
    });
    return response.data.answer;
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I couldn't reach the analyst.";
  }
};