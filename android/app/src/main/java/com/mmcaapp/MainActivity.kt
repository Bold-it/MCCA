package com.mmcaapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle
import android.view.WindowManager
import android.view.MotionEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {
  private val currentGesturePoints = mutableListOf<WritableMap>()
  private var lastGestureEndTime: Long = 0

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // 1. Screen Security
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE
    )

    // 2. Root Detection
    if (isDeviceRooted()) {
      // In a real premium app, we might block execution or flag the user
      android.util.Log.e("MMCA_SECURITY", "ROOT DETECTED: Device integrity compromised")
    }
  }

  override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
    if (ev != null) {
      val action = ev.actionMasked
      val x = ev.rawX
      val y = ev.rawY
      val pressure = ev.pressure
      val size = ev.size // Contact area size
      val timestamp = ev.eventTime // ms

      // Build touch point map
      val pt = Arguments.createMap()
      pt.putDouble("x", x.toDouble())
      pt.putDouble("y", y.toDouble())
      pt.putDouble("pressure", pressure.toDouble())
      pt.putDouble("area", size.toDouble())
      pt.putDouble("timestamp", timestamp.toDouble())

      when (action) {
        MotionEvent.ACTION_DOWN -> {
          currentGesturePoints.clear()
          currentGesturePoints.add(pt)
        }
        MotionEvent.ACTION_MOVE -> {
          currentGesturePoints.add(pt)
        }
        MotionEvent.ACTION_UP -> {
          currentGesturePoints.add(pt)
          val interStrokeTiming = if (lastGestureEndTime > 0) timestamp - lastGestureEndTime else 0
          lastGestureEndTime = timestamp

          // Build gesture batch map
          val gestureMap = Arguments.createMap()
          val pointsArray = Arguments.createArray()
          for (point in currentGesturePoints) {
            pointsArray.pushMap(point)
          }
          gestureMap.putArray("points", pointsArray)
          gestureMap.putDouble("interStrokeTiming", interStrokeTiming.toDouble())

          // Emit to JS
          val reactContext = try {
            reactInstanceManager?.currentReactContext
          } catch (e: Exception) {
            null
          }
          if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            reactContext
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
              .emit("onNativeTouchEvent", gestureMap)
          }
        }
      }
    }
    return super.dispatchTouchEvent(ev)
  }

  private fun isDeviceRooted(): Boolean {
    val buildTags = android.os.Build.TAGS
    if (buildTags != null && buildTags.contains("test-keys")) return true

    val paths = arrayOf(
      "/system/app/Superuser.apk",
      "/sbin/su",
      "/system/bin/su",
      "/system/xbin/su",
      "/data/local/xbin/su",
      "/data/local/bin/su",
      "/system/sd/xbin/su",
      "/system/bin/failsafe/su",
      "/data/local/su"
    )
    for (path in paths) {
      if (java.io.File(path).exists()) return true
    }
    return false
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MMCAApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

