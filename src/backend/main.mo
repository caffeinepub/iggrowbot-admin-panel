import Map "mo:core/Map";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import OutCall "http-outcalls/outcall";
import AccessControl "authorization/access-control";
import List "mo:core/List";

import MixinAuthorization "authorization/MixinAuthorization";


actor {
  let lowBalanceThresholdDefault = 5.0;

  type IggrowbotApiCredentials = {
    apiUrl : Text;
    apiKey : Text;
  };

  type IggrowbotService = {
    id : Text;
    name : Text;
    category : Text;
    rate : Float;
    min : Nat;
    max : Nat;
    description : Text;
  };

  type PaymentStatus = {
    #pending;
    #verified;
  };

  type PaymentRecord = {
    utr : Text;
    amount : Float;
    user : Principal;
    status : PaymentStatus;
    timestamp : Int;
  };

  type OrderStatus = {
    #pending;
    #completed;
    #failed;
  };

  type OrderRecord = {
    orderId : Text;
    serviceId : Text;
    link : Text;
    quantity : Nat;
    cost : Float;
    status : OrderStatus;
    timestamp : Int;
    apiOrderId : Text;
    user : Principal;
  };

  public type UserProfile = {
    name : Text;
  };

  let apiCredentials = Map.empty<Principal, IggrowbotApiCredentials>();
  let services = Map.empty<Text, IggrowbotService>();
  let userBalances = Map.empty<Principal, Float>();
  let payments = List.empty<PaymentRecord>();
  let orders = List.empty<OrderRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var lowBalanceThreshold = lowBalanceThresholdDefault;
  var nextOrderId = 1;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public query func transform(input: OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // User profile management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // API Credentials (admin-only)
  public shared ({ caller }) func saveCredentials(apiUrl : Text, apiKey : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can save credentials");
    };
    if (not apiUrl.startsWith(#text "https://")) {
      Runtime.trap("Invalid API URL. Must start with https://");
    };
    let credentials : IggrowbotApiCredentials = {
      apiUrl;
      apiKey;
    };
    apiCredentials.add(caller, credentials);
  };

  public query ({ caller }) func isConfigured() : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can check configuration");
    };
    apiCredentials.containsKey(caller);
  };

  public query ({ caller }) func getCredentials() : async IggrowbotApiCredentials {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can get credentials");
    };
    switch (apiCredentials.get(caller)) {
      case (null) {
        Runtime.trap("No credentials found. Please configure your IGGrowBOT API.");
      };
      case (?credentials) { credentials };
    };
  };

  // Low balance threshold (admin sets, users can view)
  public shared ({ caller }) func setLowBalanceThreshold(threshold : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set threshold");
    };
    lowBalanceThreshold := threshold;
  };

  public query ({ caller }) func getLowBalanceThreshold() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view threshold");
    };
    lowBalanceThreshold;
  };

  public shared ({ caller }) func toggleLowBalanceAlert() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle alerts");
    };
    switch (apiCredentials.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func isLowBalance() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check balance status");
    };
    switch (apiCredentials.get(caller)) {
      case (null) { false };
      case (?_) { lowBalanceThreshold > lowBalanceThreshold };
    };
  };

  // Service sync (admin-only)
  public shared ({ caller }) func syncServices() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can sync services");
    };

    let outCall : OutCall.Header = {
      name = "Auth";
      value = "Authorized";
    };

    let responseText = await OutCall.httpPostRequest(
      "https://digidrop.icp0.io/api/yk7n56r0tryf5v7r3akfy2v3n7av1eh5ekejw70zu6a5y2r9wnn1bp9akejc4jmn4aj4avpoxhxes4rhqpft2ahs9hwn7mrtk8pt6enowt",
      [outCall],
      "",
      transform,
    );
  };

  public query ({ caller }) func getServices() : async [IggrowbotService] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view services");
    };
    services.values().toArray();
  };

  // User wallet
  public query ({ caller }) func getUserBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view balance");
    };
    switch (userBalances.get(caller)) {
      case (null) { 0.0 };
      case (?balance) { balance };
    };
  };

  public shared ({ caller }) func creditUser(user : Principal, amount : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can credit users");
    };
    let currentBalance = switch (userBalances.get(user)) {
      case (null) { 0.0 };
      case (?balance) { balance };
    };
    userBalances.add(user, currentBalance + amount);
  };

  // Payment management
  public shared ({ caller }) func submitPayment(utr : Text, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit payments");
    };
    let payment : PaymentRecord = {
      utr;
      amount;
      user = caller;
      status = #pending;
      timestamp = Time.now();
    };
    payments.add(payment);
  };

  public shared ({ caller }) func verifyPayment(utr : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can verify payments");
    };

    let updatedPayments = payments.map<PaymentRecord, PaymentRecord>(
      func(payment) {
        if (payment.utr == utr) {
          {
            payment with
            status = #verified;
          };
        } else {
          payment;
        };
      }
    );

    payments.clear();
    updatedPayments.values().forEach(func(payment) { payments.add(payment) });

    payments.values().forEach(
      func(payment) {
        if (payment.utr == utr) {
          let currentBalance = switch (userBalances.get(payment.user)) {
            case (null) { 0.0 };
            case (?balance) { balance };
          };
          userBalances.add(payment.user, currentBalance + payment.amount);
        };
      }
    );
  };

  public query ({ caller }) func getMyPayments() : async [PaymentRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payments");
    };
    let myPayments = payments.filter(
      func(payment) { payment.user == caller }
    );
    myPayments.toArray();
  };

  public query ({ caller }) func getPendingPayments() : async [PaymentRecord] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view pending payments");
    };

    let pendingPayments = payments.filter(
      func(payment) { payment.status == #pending }
    );
    pendingPayments.toArray();
  };

  // Order management
  public shared ({ caller }) func placeOrder(serviceId : Text, link : Text, quantity : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };

    let service = switch (services.get(serviceId)) {
      case (null) {
        Runtime.trap("Service not found");
      };
      case (?s) { s };
    };

    let cost = service.rate * quantity.toFloat();
    let currentBalance = switch (userBalances.get(caller)) {
      case (null) { 0.0 };
      case (?balance) { balance };
    };

    if (cost > currentBalance) {
      Runtime.trap("Insufficient funds");
    };

    userBalances.add(caller, currentBalance - cost);

    let orderId = nextOrderId.toText();
    nextOrderId += 1;

    let order : OrderRecord = {
      orderId;
      serviceId;
      link;
      quantity;
      cost;
      status = #pending;
      timestamp = Time.now();
      apiOrderId = "api_" # orderId;
      user = caller;
    };

    orders.add(order);
    orderId;
  };

  public query ({ caller }) func getMyOrders() : async [OrderRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    let myOrders = orders.filter(
      func(order) { order.user == caller }
    );
    myOrders.toArray();
  };

  public shared ({ caller }) func getOrderAmount(orderId : Text) : async Float {
    let finds = orders.filter(
      func(order) { order.orderId == orderId }
    );
    let findsArray = finds.toArray();
    if (findsArray.size() == 0) { Runtime.trap("Order not found") };

    let order = findsArray[0];

    // Only the order owner or admin can view order amount
    if (caller != order.user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own orders");
    };

    order.cost;
  };
};
