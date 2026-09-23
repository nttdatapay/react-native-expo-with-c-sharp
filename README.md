# UPI Payment App – Flow & API Usage

## 1. Code Flow

1. User clicks **Google Pay / PhonePe / Paytm**.
2. `openPaymentApp(app)` is called.
3. A loading indicator is displayed.
4. `initUPIIntent()` calls the backend payment API.
5. Backend returns the `qrString` UPI URL.
6. The generic UPI URL is converted to the selected app's UPI scheme:

   * Google Pay → `tez://upi/pay`
   * PhonePe → `phonepe://pay`
   * Paytm → `paytmmp://pay`
7. The generated app-specific UPI URL is opened using `Linking.openURL()`.
8. If the API or app launch fails, an error message is displayed.
9. The loader is stopped after the operation completes.

---

## 2. API Usage

### Endpoint

```text
POST http://10.0.2.2:3000/init-upi-intent
```

> `10.0.2.2` is used when the React Native app runs on an Android emulator and the backend runs on the development machine.

### Request

```json
{
  "amount": "1121.00",
  "txnId": "SL_3",
  "email": "test@gmail.com",
  "phone": "8888888888"
}
```

### Response

```json
{
  "success": true,
  "message": "Transaction initiated",
  "amount": "1121.00",
  "merchTxnId": "SL_3",
  "qrString": "upi://pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker&tr=8811000000919146&am=1121.00&cu=INR&mc=6211&mode=null"
}
```

The application uses the `qrString` field from the API response.

---

## 3. UPI URL Conversion

The backend returns a generic UPI URL:

```text
upi://pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker&tr=8811000000919146&am=1121.00&cu=INR&mc=6211&mode=null
```

Based on the selected application, only the scheme is changed.

### Google Pay

```text
tez://upi/pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker&tr=8811000000919146&am=1121.00&cu=INR&mc=6211&mode=null
```

### PhonePe

```text
phonepe://pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker&tr=8811000000919146&am=1121.00&cu=INR&mc=6211&mode=null
```

### Paytm

```text
paytmmp://pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker&tr=8811000000919146&am=1121.00&cu=INR&mc=6211&mode=null
```

The UPI parameters returned by the backend are not modified.

---

## 4. Required Packages

### `package.json`

```json
{
  "dependencies": {
    "expo": "~latest",
    "expo-intent-launcher": "latest",
    "expo-dev-client": "latest",
    "react": "latest",
    "react-native": "latest"
  }
}
```

Install the required Expo packages:

```bash
npx expo install expo-intent-launcher expo-dev-client
```

Build the Android development application:

```bash
npx expo prebuild
npx expo run:android
```

Start the development server:

```bash
npx expo start --dev-client
```

---

## 5. Current Code Dependencies

The UI uses standard React Native components:

```text
View
Text
TouchableOpacity
ActivityIndicator
Alert
Linking
```

No `react-native-svg` dependency is required for the current implementation.

---

## 6. Payment Flow Summary

```text
User selects UPI App
        ↓
Show Loader
        ↓
POST /init-upi-intent
        ↓
Backend initializes transaction
        ↓
Receive qrString
        ↓
Convert UPI scheme
        ↓
tez://upi/pay
phonepe://pay
paytmmp://pay
        ↓
Open Selected UPI App
        ↓
User completes payment
```

> The app launch only starts the UPI payment flow. Payment success should be confirmed separately through the payment gateway/backend transaction-status or callback mechanism.
