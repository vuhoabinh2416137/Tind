package com.messenger.service;

import com.messenger.dto.AuthRequest;
import com.messenger.dto.RegisterRequest;
import com.messenger.model.User;
import com.messenger.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private static final Set<String> DEMO_USER_IDS = Set.of(
        "u_ducanh", "u_baolong", "u_khanhvy", "u_meta_ai"
    );

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public static String hashPassword(String rawPassword) {
        if (rawPassword == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedhash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    public List<User> getAllUsers() {
        return userRepository.findAll().stream()
            .filter(u -> !DEMO_USER_IDS.contains(u.getId()))
            .toList();
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username);
    }

    @Transactional
    public User register(RegisterRequest req) {
        if (req.getUsername() == null || req.getName() == null || req.getName().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập đầy đủ Họ tên và Tên đăng nhập");
        }

        String cleanUsername = req.getUsername().toLowerCase().replaceAll("[^a-z0-9_.]", "").trim();
        if (cleanUsername.length() < 3) {
            throw new IllegalArgumentException("Tên đăng nhập phải có ít nhất 3 ký tự");
        }

        if (req.getPassword() == null || req.getPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự");
        }

        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new IllegalArgumentException("Tên đăng nhập này đã được sử dụng");
        }

        String userId = "u_" + cleanUsername + "_" + UUID.randomUUID().toString().substring(0, 4);
        String encodedName = URLEncoder.encode(req.getName().trim(), StandardCharsets.UTF_8);
        String defaultAvatar = "https://ui-avatars.com/api/?name=" + encodedName + "&background=0084FF&color=fff&bold=true&size=150";
        String avatar = (req.getAvatar() != null && !req.getAvatar().isBlank())
            ? req.getAvatar()
            : defaultAvatar;

        User user = new User(
            userId,
            cleanUsername,
            req.getName().trim(),
            avatar,
            req.getStatus() != null ? req.getStatus() : "Đang hoạt động trên Messenger",
            false
        );
        user.setPassword(hashPassword(req.getPassword()));
        user.setOnline(true);

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User login(AuthRequest req) {
        if (req.getUsername() == null || req.getUsername().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập tên đăng nhập");
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu");
        }

        User user = userRepository.findByUsernameIgnoreCase(req.getUsername().trim())
            .orElseThrow(() -> new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác"));

        if (DEMO_USER_IDS.contains(user.getId())) {
            throw new IllegalArgumentException("Tài khoản không tồn tại");
        }

        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            String hashedInput = hashPassword(req.getPassword());
            if (!user.getPassword().equals(hashedInput)) {
                throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác");
            }
        }

        return user;
    }

    @Transactional(readOnly = true)
    public List<User> searchUsers(String query, String excludeUserId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository.searchUsers(query.trim()).stream()
            .filter(u -> !u.getId().equals(excludeUserId) && !DEMO_USER_IDS.contains(u.getId()))
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
