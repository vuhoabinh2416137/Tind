package com.messenger.service;

import com.messenger.dto.AuthRequest;
import com.messenger.dto.RegisterRequest;
import com.messenger.model.User;
import com.messenger.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username);
    }

    @Transactional
    public User register(RegisterRequest req) {
        if (req.getUsername() == null || req.getName() == null) {
            throw new IllegalArgumentException("Vui lòng cung cấp đầy đủ Tên và Tên người dùng");
        }

        String cleanUsername = req.getUsername().toLowerCase().replaceAll("[^a-z0-9_]", "").trim();
        if (cleanUsername.isEmpty()) {
            throw new IllegalArgumentException("Tên người dùng không hợp lệ");
        }

        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new IllegalArgumentException("Tên người dùng này đã tồn tại, vui lòng chọn tên khác");
        }

        String userId = "u_" + cleanUsername + "_" + UUID.randomUUID().toString().substring(0, 4);
        String avatar = (req.getAvatar() != null && !req.getAvatar().isBlank()) 
            ? req.getAvatar() 
            : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

        User user = new User(
            userId,
            cleanUsername,
            req.getName().trim(),
            avatar,
            req.getStatus() != null ? req.getStatus() : "Mới tham gia Messenger 🚀",
            false
        );
        user.setOnline(true);

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User login(AuthRequest req) {
        if (req.getUsername() == null || req.getUsername().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập tên người dùng");
        }
        return userRepository.findByUsernameIgnoreCase(req.getUsername().trim())
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với username này"));
    }

    @Transactional(readOnly = true)
    public List<User> searchUsers(String query, String excludeUserId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository.searchUsers(query.trim()).stream()
            .filter(u -> !u.getId().equals(excludeUserId))
            .limit(10)
            .toList();
    }

    @Transactional
    public void setUserOnline(String userId, boolean online) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setOnline(online);
            user.setLastSeen(Instant.now().toEpochMilli());
            userRepository.save(user);
        });
    }
}
