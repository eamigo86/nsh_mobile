// Shows the NSH Todo app full screen. Release builds load the bundle shipped in the app (`nsh build`);
// Debug builds, linked with NativeShellDev, connect to `nsh dev` when given `--dev-server <ws url>`
// (or the NSH_DEV_SERVER environment variable) and load the bundle otherwise.
import NativeShell
import UIKit

final class HostViewController: UIViewController {
    private let app = NshAppView()
    private var location: LocationBridge?

    override func viewDidLoad() {
        super.viewDidLoad()
        app.translatesAutoresizingMaskIntoConstraints = false
        app.onError = { print("nsh error: \($0)") }
        view.addSubview(app)
        NSLayoutConstraint.activate([
            app.topAnchor.constraint(equalTo: view.topAnchor),
            app.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            app.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            app.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        location = LocationBridge(view: app)  // before the load: the app may call it at start
        do {
            if let dev = devServer() {
                try app.connectDevServer(dev)
            } else if let url = Bundle.main.url(forResource: "bundle", withExtension: "nshc", subdirectory: "nsh") {
                try app.loadBundle(at: url)
            } else {
                print("nsh: no bundle in the app; run `make ios-host`")
            }
        } catch {
            print("nsh: cannot load: \(error)")
        }
    }

    private func devServer() -> URL? {
        #if DEBUG
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "--dev-server"), i + 1 < args.count { return URL(string: args[i + 1]) }
        return ProcessInfo.processInfo.environment["NSH_DEV_SERVER"].flatMap(URL.init(string:))
        #else
        return nil
        #endif
    }

    // Let the embedded app's pages and dialogs decide the status bar.
    override var preferredStatusBarStyle: UIStatusBarStyle { NshAppView.preferredStatusBarStyle }
    override var prefersStatusBarHidden: Bool { NshAppView.prefersStatusBarHidden }
    override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { NshAppView.preferredStatusBarUpdateAnimation }
}
