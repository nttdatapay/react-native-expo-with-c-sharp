import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PaymentApp = "gpay" | "phonepe" | "paytm";

/*
 * =========================================================
 * PAYMENT APP CONFIGURATION
 * =========================================================
 */

const PAYMENT_APPS = {
  gpay: {
    name: "Google Pay",
    scheme: "tez://upi/pay",

    // Google Pay Android package
    package: "com.google.android.apps.nbu.paisa.user",

    color: "#4285F4",
  },

  phonepe: {
    name: "PhonePe",
    scheme: "phonepe://pay",

    // PhonePe Android package
    package: "com.phonepe.app",

    color: "#5F259F",
  },

  paytm: {
    name: "Paytm",
    scheme: "paytmmp://pay",

    // Paytm Android package
    package: "net.one97.paytm",

    color: "#00B9F1",
  },
};

/*
 * =========================================================
 * INITIALIZE UPI TRANSACTION
 * =========================================================
 */

const initUPIIntent = async () => {
  console.log("");
  console.log("=================================");
  console.log("INIT UPI INTENT");
  console.log("=================================");

  const response = await fetch("http://10.0.2.2:3000/init-upi-intent", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      amount: "1121.00",
      txnId: "SL_3",
      email: "test@gmail.com",
      phone: "8888888888",
    }),
  });

  console.log("HTTP Status:", response.status);

  /*
   * Read response as text first.
   */
  const responseText = await response.text();

  console.log("Raw API Response:", responseText);

  if (!response.ok) {
    throw new Error(`Payment API failed with HTTP ${response.status}`);
  }

  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error("Payment API returned an invalid JSON response.");
  }

  console.log("Parsed API Response:", data);

  /*
   * Check business-level success
   */
  if (data.success !== true) {
    throw new Error(data.message || "Transaction initialization failed.");
  }

  /*
   * IMPORTANT:
   *
   * Your API returns the UPI URL in qrString.
   */
  if (!data.qrString || typeof data.qrString !== "string") {
    throw new Error("Payment API did not return a valid UPI QR string.");
  }

  return data;
};

/*
 * =========================================================
 * CREATE APP-SPECIFIC UPI URL
 * =========================================================
 *
 * API returns:
 *
 * upi://pay?pa=atomots@upi&pn=OTSMERCHONLINEBroker...
 *
 * Google Pay:
 *
 * tez://upi/pay?pa=atomots@upi...
 *
 * PhonePe:
 *
 * phonepe://pay?pa=atomots@upi...
 *
 * Paytm:
 *
 * paytmmp://pay?pa=atomots@upi...
 */

function createAppUPIUrl(genericUPIUrl: string, app: PaymentApp) {
  const selectedApp = PAYMENT_APPS[app];

  const cleanUrl = genericUPIUrl.trim();

  console.log("");
  console.log("Generic UPI URL:");
  console.log(cleanUrl);

  /*
   * Verify that the API returned a UPI URL.
   */
  if (!cleanUrl.toLowerCase().startsWith("upi://pay")) {
    throw new Error("Invalid UPI URL returned by payment API.");
  }

  /*
   * Replace ONLY:
   *
   * upi://pay
   *
   * with:
   *
   * tez://upi/pay
   * phonepe://pay
   * paytmmp://pay
   *
   * All query parameters remain unchanged.
   */

  const appUrl = cleanUrl.replace(/^upi:\/\/pay/i, selectedApp.scheme);

  console.log("");
  console.log(`${selectedApp.name} UPI URL:`);
  console.log(appUrl);
  console.log("");

  return appUrl;
}

/*
 * =========================================================
 * OPEN PAYMENT APP
 * =========================================================
 */

async function openPaymentApp(
  app: PaymentApp,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const selectedApp = PAYMENT_APPS[app];

  try {
    /*
     * -----------------------------------------------------
     * START LOADER
     * -----------------------------------------------------
     */

    setLoading(true);

    console.log("");
    console.log("=================================");
    console.log(`SELECTED PAYMENT APP: ${selectedApp.name}`);
    console.log("=================================");

    /*
     * -----------------------------------------------------
     * STEP 1
     *
     * Initialize transaction through backend.
     * -----------------------------------------------------
     */

    const apiResponse = await initUPIIntent();

    console.log("Transaction initialized successfully.");

    console.log("Merchant Transaction ID:", apiResponse.merchTxnId);

    /*
     * -----------------------------------------------------
     * STEP 2
     *
     * Get UPI URL from qrString.
     * -----------------------------------------------------
     */

    const genericUPIUrl = apiResponse.qrString;

    /*
     * -----------------------------------------------------
     * STEP 3
     *
     * Convert generic UPI URL into
     * selected application's scheme.
     * -----------------------------------------------------
     */

    const appUPIUrl = createAppUPIUrl(genericUPIUrl, app);

    /*
     * -----------------------------------------------------
     * STEP 4
     *
     * Stop loader before opening external application.
     * -----------------------------------------------------
     */

    setLoading(false);

    /*
     * -----------------------------------------------------
     * STEP 5
     *
     * Open selected payment application.
     * -----------------------------------------------------
     */

    console.log(`Opening ${selectedApp.name}...`);

    try {
      /*
       * Using Linking.openURL allows Android to
       * resolve the custom UPI scheme.
       */
      await Linking.openURL(appUPIUrl);

      console.log(`${selectedApp.name} launch request sent successfully.`);
    } catch (appError) {
      /*
       * The API was successful, but the selected
       * payment application could not be opened.
       */

      console.error(`Unable to open ${selectedApp.name}:`, appError);

      Alert.alert(
        `${selectedApp.name} Not Available`,
        `${selectedApp.name} is not installed or cannot handle this UPI payment.`,
      );
    }
  } catch (error) {
    /*
     * -----------------------------------------------------
     * API / TRANSACTION INITIALIZATION ERROR
     * -----------------------------------------------------
     */

    console.error("Payment initialization error:", error);

    Alert.alert(
      "Payment Initialization Failed",
      error instanceof Error
        ? error.message
        : "Unable to initialize the payment transaction.",
    );
  } finally {
    /*
     * Always remove loader.
     */
    setLoading(false);
  }
}

/*
 * =========================================================
 * GOOGLE PAY ICON
 * =========================================================
 */

function GPayIcon() {
  return (
    <View style={styles.iconCircle}>
      <Text
        style={[
          styles.iconText,
          {
            color: "#4285F4",
          },
        ]}
      >
        G
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * PHONEPE ICON
 * =========================================================
 */

function PhonePeIcon() {
  return (
    <View
      style={[
        styles.iconCircle,
        {
          backgroundColor: "#5F259F",
        },
      ]}
    >
      <Text style={styles.phonePeIconText}>पे</Text>
    </View>
  );
}

/*
 * =========================================================
 * PAYTM ICON
 * =========================================================
 */

function PaytmIcon() {
  return (
    <View
      style={[
        styles.iconCircle,
        {
          backgroundColor: "#E8F9FF",
        },
      ]}
    >
      <Text
        style={[
          styles.paytmIconText,
          {
            color: "#00B9F1",
          },
        ]}
      >
        P
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * PAYMENT BUTTON
 * =========================================================
 */

function PaymentButton({
  app,
  icon,
  loading,
  onPress,
}: {
  app: PaymentApp;
  icon: React.ReactNode;
  loading: boolean;
  onPress: () => void;
}) {
  const paymentApp = PAYMENT_APPS[app];

  return (
    <TouchableOpacity
      style={[styles.appButton, loading && styles.appButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={loading}
    >
      {icon}

      <View style={styles.appInfo}>
        <Text style={styles.appText}>{paymentApp.name}</Text>

        <Text style={styles.appSubText}>
          Pay ₹1121.00 using {paymentApp.name}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={paymentApp.color} />
      ) : (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );
}

/*
 * =========================================================
 * MAIN SCREEN
 * =========================================================
 */

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Payment App</Text>

      <Text style={styles.amount}>₹1121.00</Text>

      <Text style={styles.subtitle}>Select your preferred UPI app</Text>

      {/* Google Pay */}

      <PaymentButton
        app="gpay"
        icon={<GPayIcon />}
        loading={loading}
        onPress={() => openPaymentApp("gpay", setLoading)}
      />

      {/* PhonePe */}

      <PaymentButton
        app="phonepe"
        icon={<PhonePeIcon />}
        loading={loading}
        onPress={() => openPaymentApp("phonepe", setLoading)}
      />

      {/* Paytm */}

      <PaymentButton
        app="paytm"
        icon={<PaytmIcon />}
        loading={loading}
        onPress={() => openPaymentApp("paytm", setLoading)}
      />

      {/* Full-screen loading overlay */}

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#5F259F" />

            <Text style={styles.loadingText}>Initializing payment...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  amount: {
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
    marginBottom: 32,
  },

  appButton: {
    minHeight: 76,
    borderRadius: 16,

    backgroundColor: "#F7F7F7",

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 18,

    marginBottom: 16,
  },

  appButtonDisabled: {
    opacity: 0.55,
  },

  iconCircle: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: "#F1F1F1",

    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    fontSize: 28,
    fontWeight: "700",
  },

  phonePeIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  paytmIconText: {
    fontSize: 28,
    fontWeight: "800",
  },

  appInfo: {
    flex: 1,
    marginLeft: 16,
  },

  appText: {
    fontSize: 18,
    fontWeight: "600",
  },

  appSubText: {
    fontSize: 13,
    color: "#777777",
    marginTop: 4,
  },

  arrow: {
    fontSize: 32,
    color: "#999999",
    marginLeft: 10,
  },

  loadingOverlay: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: "rgba(255,255,255,0.85)",

    justifyContent: "center",
    alignItems: "center",
  },

  loadingBox: {
    width: 220,

    paddingVertical: 25,
    paddingHorizontal: 20,

    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    alignItems: "center",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.15,
    shadowRadius: 10,

    elevation: 6,
  },

  loadingText: {
    marginTop: 15,

    fontSize: 15,

    fontWeight: "600",

    color: "#333333",
  },
});
