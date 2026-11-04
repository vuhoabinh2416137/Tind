package com.messenger.service;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Random;

@Service
public class MetaAiService {

    private final Random random = new Random();

    private final List<String> greetings = List.of(
        "Chào bạn! Rất vui được trò chuyện cùng bạn. Hôm nay bạn thế nào?",
        "Xin chào! Tôi là Meta AI trên hệ thống Spring Boot. Tôi có thể hỗ trợ gì cho bạn hôm nay? 😊",
        "Chào bạn! Chúc bạn một ngày tràn đầy năng lượng và hiệu quả nhé!"
    );

    private final List<String> messengerFeatures = List.of(
        "Hệ thống Messenger Web này đang chạy trên nền tảng Spring Boot 3 mạnh mẽ kết hợp STOMP WebSocket và React 18!",
        "Bạn có thể thử tính năng thả cảm xúc (❤️, 👍, 😂), gửi ảnh, hoặc mở tab mới để chat 2 chiều cực mượt!",
        "Hệ thống hỗ trợ cả thu hồi tin nhắn (Unsend) và hiển thị đã xem (Seen) nữa đó!"
    );

    private final List<String> jokes = List.of(
        "Tại sao các lập trình viên thích bóng tối? Vì bugs thường bị thu hút bởi ánh sáng! 🐛😆",
        "Có 10 loại người trên thế giới: những người hiểu hệ nhị phân và những người không hiểu! 😂",
        "Tại sao Java và C++ không đi chơi cùng nhau? Vì Java nghĩ C++ không có class (lớp học)! 🤣"
    );

    private final List<String> helps = List.of(
        "Tôi có thể hỗ trợ bạn:\n1. Giải đáp thắc mắc về Spring Boot & React\n2. Kể chuyện cười\n3. Trò chuyện giải tỏa căng thẳng\n4. Thử nghiệm các tính năng chat thời gian thực!",
        "Bạn cứ thoải mái nhắn bất kỳ điều gì, tôi sẽ phản hồi ngay nhé!"
    );

    private final List<String> defaultReplies = List.of(
        "Nghe thú vị thật đấy! Bạn có thể chia sẻ thêm về điều này không?",
        "Tôi hiểu rồi! Cảm ơn bạn đã trò chuyện cùng tôi. Có điều gì bạn muốn khám phá tiếp theo không?",
        "Thật tuyệt vời! Mình luôn ở đây để đồng hành cùng bạn trên Messenger!",
        "Tôi đã ghi nhận ý kiến của bạn! Hãy thử gửi một bức ảnh hoặc thả icon xem sao nhé! ✨"
    );

    public String generateReply(String userMessage) {
        if (userMessage == null) return getRandom(defaultReplies);
        String text = userMessage.toLowerCase().trim();

        if (text.matches(".*(chào|hello|hi|hey|alo).*")) {
            return getRandom(greetings);
        }
        if (text.matches(".*(messenger|tính năng|app|ứng dụng|spring boot|react).*")) {
            return getRandom(messengerFeatures);
        }
        if (text.matches(".*(hài|cười|vui|kể chuyện).*")) {
            return getRandom(jokes);
        }
        if (text.matches(".*(giúp|help|làm gì|hỗ trợ).*")) {
            return getRandom(helps);
        }

        return getRandom(defaultReplies);
    }

    private String getRandom(List<String> list) {
        return list.get(random.nextInt(list.size()));
    }
}
