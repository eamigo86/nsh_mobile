// Answers the app's `host.call("location.current")` with the device position from CoreLocation.
// Contract with the TSX side (location.ts): resolve { latitude, longitude, accuracy } (degrees, metres),
// reject with "denied", "disabled" or the error's text.
import CoreLocation
import NativeShell

@MainActor
final class LocationBridge: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var waiting: [NshHostReply] = []
    private var locating = false

    init(view: NshAppView) {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        view.handle("location.current") { [weak self] _, reply in
            guard let self else { return reply.reject("unavailable") }
            self.request(reply)
        }
    }

    private func request(_ reply: NshHostReply) {
        guard CLLocationManager.locationServicesEnabled() else { return reply.reject("disabled") }
        waiting.append(reply)
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()  // answered in the delegate below
        case .denied, .restricted: finish { $0.reject("denied") }
        default: locate()
        }
    }

    private func locate() {
        guard !locating else { return }
        locating = true
        manager.requestLocation()
    }

    private func finish(_ answer: (NshHostReply) -> Void) {
        let replies = waiting
        waiting = []
        locating = false
        replies.forEach(answer)
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            guard !self.waiting.isEmpty else { return }
            switch status {
            case .notDetermined: break
            case .denied, .restricted: self.finish { $0.reject("denied") }
            default: self.locate()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let fix = locations.last else { return }
        let position: [String: Double] = [
            "latitude": fix.coordinate.latitude, "longitude": fix.coordinate.longitude, "accuracy": fix.horizontalAccuracy,
        ]
        Task { @MainActor in self.finish { $0.resolve(position) } }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let message = (error as? CLError)?.code == .denied ? "denied" : error.localizedDescription
        Task { @MainActor in self.finish { $0.reject(message) } }
    }
}
