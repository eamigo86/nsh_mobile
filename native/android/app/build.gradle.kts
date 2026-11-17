plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.nshtodo.host"
    compileSdk = 36
    // The NDK installed here; without one AGP cannot strip libnsh.so (73 MB per ABI unstripped).
    ndkVersion = "28.0.13004108"

    defaultConfig {
        applicationId = "com.example.nshtodo.host"
        minSdk = 26 // NSH needs API 26+
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
}

// The embed libraries come from `make embed-libs` (release v0.5.1 of longbridge/nsh).
val nshLibs = rootProject.file("../libs/android/nsh-embed-android")

dependencies {
    debugImplementation(files(nshLibs.resolve("nsh-dev.aar"))) // also connects to `nsh dev`
    releaseImplementation(files(nshLibs.resolve("nsh.aar")))
    implementation("androidx.activity:activity:1.12.4") // ComponentActivity: the ActivityResult API
}
