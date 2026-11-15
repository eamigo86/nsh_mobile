plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.nshtodo.host"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.nshtodo.host"
        minSdk = 26 // NSH needs API 26+
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
}

// The embed libraries come from `make embed-libs` (release v0.5.0 of longbridge/nsh).
val nshLibs = rootProject.file("../libs/android/nsh-embed-android")

dependencies {
    debugImplementation(files(nshLibs.resolve("nsh-dev.aar"))) // also connects to `nsh dev`
    releaseImplementation(files(nshLibs.resolve("nsh.aar")))
    implementation("androidx.activity:activity:1.12.4") // ComponentActivity: the ActivityResult API
}
