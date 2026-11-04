// Smart AI Bot Simulation for Meta AI

const RESPONSES = {
  greetings: [
    'Chào bạn! Rất vui được trò chuyện cùng bạn. Hôm nay bạn thế nào?',
    'Xin chào! Tôi là Meta AI, trợ lý ảo trên Messenger. Tôi có thể giúp gì cho bạn hôm nay? 😊',
    'Chào bạn! Chúc bạn một ngày tràn đầy năng lượng và hiệu quả nhé!'
  ],
  messenger: [
    'Ứng dụng Messenger Web này được thiết kế với chuẩn giao diện hiện đại: Socket.IO thời gian thực, React 18, Tailwind CSS và hiệu ứng âm thanh sống động!',
    'Bạn có thể thử tính năng thả cảm xúc (❤️, 👍, 😂), gửi ảnh, hoặc chuyển đổi tài khoản ở thanh bên để chat 2 chiều cực mượt!',
    'Messenger hỗ trợ cả thu hồi tin nhắn (Unsend) và hiển thị đã xem (Seen) nữa đó!'
  ],
  weather: [
    'Thời tiết hôm nay rất thích hợp để nhâm nhi một tách cà phê và lập trình đấy bạn ơi! ☕⛅',
    'Dự báo thời tiết: Trời trong xanh, tâm trạng coder đang ở mức năng suất cao nhất!'
  ],
  joke: [
    'Tại sao các lập trình viên thích bóng tối? Vì bugs thường bị thu hút bởi ánh sáng! 🐛😆',
    'Có 10 loại người trên thế giới: những người hiểu hệ nhị phân và những người không hiểu! 😂',
    'Tại sao Java và C++ không đi chơi cùng nhau? Vì Java nghĩ C++ không có class (lớp học)! 🤣'
  ],
  help: [
    'Tôi có thể hỗ trợ bạn:\n1. Giải đáp thắc mắc về công nghệ\n2. Kể chuyện cười\n3. Trò chuyện giải tỏa căng thẳng\n4. Thử nghiệm các tính năng chat thời gian thực!',
    'Bạn cứ thoải mái nhắn bất kỳ điều gì, tôi sẽ phản hồi ngay nhé!'
  ],
  default: [
    'Nghe thú vị thật đấy! Bạn có thể chia sẻ thêm về điều này không?',
    'Tôi hiểu rồi! Cảm ơn bạn đã trò chuyện cùng tôi. Có điều gì bạn muốn khám phá tiếp theo không?',
    'Thật tuyệt vời! Mình luôn ở đây để đồng hành cùng bạn trên Messenger!',
    'Tôi đã ghi nhận ý kiến của bạn! Hãy thử gửi một bức ảnh hoặc thả icon xem sao nhé! ✨'
  ]
};

export function generateBotReply(userMessage) {
  const text = (userMessage || '').toLowerCase().trim();

  if (/chào|hello|hi|hey|alo/i.test(text)) {
    return getRandom(RESPONSES.greetings);
  }
  if (/messenger|tính năng|app|ứng dụng|web/i.test(text)) {
    return getRandom(RESPONSES.messenger);
  }
  if (/thời tiết|nắng|mưa/i.test(text)) {
    return getRandom(RESPONSES.weather);
  }
  if (/hài|cười|vui|kể chuyện/i.test(text)) {
    return getRandom(RESPONSES.joke);
  }
  if (/giúp|help|làm gì|hỗ trợ/i.test(text)) {
    return getRandom(RESPONSES.help);
  }

  return getRandom(RESPONSES.default);
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
