// stdformat.h -- std::format compatibility shim for Android NDK r26
//
// NDK r26's libc++ does not implement std::format (it requires NDK r27+),
// but React Native 0.85.x uses std::format in graphicsConversions.h.
// We provide a minimal compatible implementation here.
//
// This header is force-included via the -include compiler flag in build.gradle.
// It only activates when __cpp_lib_format is NOT defined (i.e. no native support).

#pragma once

#ifndef __cpp_lib_format

#include <string>
#include <sstream>

namespace std {

// Single-argument std::format (the only usage in graphicsConversions.h)
// e.g.: std::format("{}%", dimension.value)  →  "42.5%"
template<typename T>
inline std::string format(const char* fmt, T val) {
    std::ostringstream oss;
    oss << val;
    const std::string val_str = oss.str();

    std::string result;
    const std::string fmt_str(fmt);
    std::size_t i = 0;
    bool replaced = false;

    while (i < fmt_str.size()) {
        if (!replaced && (i + 1) < fmt_str.size()
                && fmt_str[i] == '{'
                && fmt_str[i + 1] == '}') {
            result += val_str;
            i += 2;
            replaced = true;
        } else {
            result += fmt_str[i++];
        }
    }
    return result;
}

// Two-argument overload for completeness
template<typename T1, typename T2>
inline std::string format(const char* fmt, T1 v1, T2 v2) {
    const std::string fmt_str(fmt);
    std::string result;
    std::size_t i = 0;
    int count = 0;

    while (i < fmt_str.size()) {
        if ((i + 1) < fmt_str.size()
                && fmt_str[i] == '{'
                && fmt_str[i + 1] == '}') {
            std::ostringstream oss;
            if (count == 0) oss << v1;
            else            oss << v2;
            result += oss.str();
            i += 2;
            ++count;
        } else {
            result += fmt_str[i++];
        }
    }
    return result;
}

} // namespace std

#endif // !__cpp_lib_format
