# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep class com.iptv.app.core.model.** { *; }
-keep class com.iptv.app.core.network.dto.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}
