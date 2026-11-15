package com.example.nshtodo.host

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.longbridge.nsh.NshHostReply
import com.longbridge.nsh.NshView

/**
 * Answers the app's `host.call("location.current")` with the device position from the platform LocationManager
 * (no Google Play services). Contract with the TSX side (location.ts): resolve { latitude, longitude, accuracy }
 * (degrees, metres), reject with "denied", "disabled" or an error text.
 */
class LocationBridge(private val activity: ComponentActivity, nsh: NshView) {
    private val manager = activity.getSystemService(LocationManager::class.java)
    private val waiting = mutableListOf<NshHostReply>()
    private val permissions = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

    private val ask = activity.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        val replies = waiting.toList().also { waiting.clear() }
        if (granted.values.any { it }) replies.forEach(::locate) else replies.forEach { it.reject("denied") }
    }

    init {
        nsh.handle("location.current") { _, reply -> request(reply) }
    }

    private fun has(permission: String) = activity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

    private fun request(reply: NshHostReply) {
        if (!enabled()) return reply.reject("disabled")
        if (permissions.any(::has)) return locate(reply)
        val first = waiting.isEmpty()
        waiting += reply
        if (first) ask.launch(permissions) // one dialog for any number of calls
    }

    private fun enabled(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) manager.isLocationEnabled
        else @Suppress("DEPRECATION") (Settings.Secure.getInt(activity.contentResolver, Settings.Secure.LOCATION_MODE, 0) != 0)

    /** GPS when the fine permission is held, else the network; whichever is on. */
    private fun provider(): String? {
        val fine = has(Manifest.permission.ACCESS_FINE_LOCATION)
        val on = manager.getProviders(true)
        return listOfNotNull(LocationManager.GPS_PROVIDER.takeIf { fine }, LocationManager.NETWORK_PROVIDER).firstOrNull { it in on }
    }

    private fun done(reply: NshHostReply, fix: Location?) {
        if (fix == null) return reply.reject("no position fix")
        reply.resolve(mapOf("latitude" to fix.latitude, "longitude" to fix.longitude, "accuracy" to fix.accuracy.toDouble()))
    }

    private fun locate(reply: NshHostReply) {
        val provider = provider() ?: return reply.reject("disabled")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                manager.getCurrentLocation(provider, null, activity.mainExecutor) { done(reply, it) }
            } else {
                legacySingleUpdate(provider, reply)
            }
        } catch (e: SecurityException) {
            reply.reject("denied")
        }
    }

    // ponytail: API 26-29 has no getCurrentLocation; a single update with a 20 s timeout is the fallback.
    @Suppress("DEPRECATION")
    private fun legacySingleUpdate(provider: String, reply: NshHostReply) {
        val main = Handler(Looper.getMainLooper())
        var finished = false
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (finished) return
                finished = true
                main.removeCallbacksAndMessages(null)
                done(reply, location)
            }

            @Deprecated("API 29 and below call it")
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }
        manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
        main.postDelayed({
            if (finished) return@postDelayed
            finished = true
            manager.removeUpdates(listener)
            reply.reject("timed out waiting for a position fix")
        }, 20_000)
    }
}
