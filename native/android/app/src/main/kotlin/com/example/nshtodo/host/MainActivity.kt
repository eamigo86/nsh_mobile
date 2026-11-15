package com.example.nshtodo.host

import android.util.Log
import android.os.Bundle
import androidx.activity.ComponentActivity
import com.longbridge.nsh.NshView

/**
 * Shows the NSH Todo app full screen from the bundle in assets/nsh (`make android-host`).
 * With the debug library it connects to `nsh dev` instead when started with `--es dev_server ws://127.0.0.1:8790/ws`
 * (after `adb reverse tcp:8790 tcp:8790`); the release library ignores it.
 */
class MainActivity : ComponentActivity() {
    private lateinit var nsh: NshView
    private lateinit var location: LocationBridge

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nsh = NshView(this)
        nsh.setErrorListener { Log.e("nsh", it) }
        setContentView(nsh)
        location = LocationBridge(this, nsh) // before the load: the app may call it at start
        val dev = intent.getStringExtra("dev_server")
        if (dev == null || !nsh.connectDevServer(dev)) nsh.loadAssetBundle("nsh")
    }

    override fun onDestroy() {
        nsh.destroy()
        super.onDestroy()
    }
}
