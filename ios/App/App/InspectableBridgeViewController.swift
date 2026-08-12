import Capacitor
import WebKit

class InspectableBridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        #if DEBUG || PREVIEW
        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }
        #endif
    }
}
