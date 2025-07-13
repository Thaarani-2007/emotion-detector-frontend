import axios from 'axios';

export const predictEmotion = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(' https://emotion-detector-backend-3.onrender.com', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (err) {
    console.error("🔴 Axios Error:", err.response || err.message);
    if (err.response && err.response.data) {
      return err.response.data;
    } else {
      throw new Error("Server not responding.");
    }
  }
};
