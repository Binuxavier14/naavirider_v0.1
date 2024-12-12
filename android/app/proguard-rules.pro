# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
# Keep React Native vector icons
-keep class com.facebook.react.views.text.** { *; }
-keep class com.facebook.react.modules.i18nmanager.I18nUtil { *; }

# Keep vector icons fonts from react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }
-dontwarn com.oblador.vectoricons.**

# If you use react-native-fresco (image loading library), you might also need this
-keep class com.facebook.react.modules.fresco.** { *; }

# Ensure that ProGuard doesn’t strip other React Native dependencies
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**
