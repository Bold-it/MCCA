# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# MMCA Specific Hardening
-keep class com.mmcaapp.** { *; }
-dontwarn com.mmcaapp.**

# React Native
-keep class com.facebook.react.bridge.CatalystInstanceImpl { *; }
-keep class com.facebook.react.bridge.JavaScriptExecutor { *; }
-keep class com.facebook.react.bridge.ReactContext { *; }
-keep class com.facebook.react.uimanager.UIImplementation { *; }
-keep class com.facebook.react.uimanager.UIManagerModule { *; }

# Security hardening: Obfuscate everything else
-optimizationpasses 5
-allowaccessmodification
-dontpreverify
-repackageclasses ''
-hierarchicalrepackageclasses ''
