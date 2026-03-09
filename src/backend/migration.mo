import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  let lowBalanceThresholdDefault = 5.0;

  // Old types from original actor
  type Credentials = {
    apiUrl : Text;
    apiKey : Text;
  };

  type OldActor = {
    apiCredentials : Map.Map<Principal, Credentials>;
  };

  // New types for extended actor
  type Network = {
    #mainnet;
    #testnet;
  };

  type NewActor = {
    apiCredentials : Map.Map<Principal, Credentials>;
    services : Map.Map<Text, {
      id : Text;
      name : Text;
      category : Text;
      rate : Float;
      min : Nat;
      max : Nat;
      description : Text;
    }>;
    userBalances : Map.Map<Principal, Float>;
    payments : List.List<{
      utr : Text;
      amount : Float;
      user : Principal;
      status : {
        #pending;
        #verified;
      };
      timestamp : Int;
    }>;
    orders : List.List<{
      orderId : Text;
      serviceId : Text;
      link : Text;
      quantity : Nat;
      cost : Float;
      status : {
        #pending;
        #completed;
        #failed;
      };
      timestamp : Int;
      apiOrderId : Text;
      user : Principal;
    }>;
    lowBalanceThreshold : Float;
    nextOrderId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      apiCredentials = old.apiCredentials;
      services = Map.empty<Text, {
        id : Text;
        name : Text;
        category : Text;
        rate : Float;
        min : Nat;
        max : Nat;
        description : Text;
      }>();
      userBalances = Map.empty<Principal, Float>();
      payments = List.empty<{
        utr : Text;
        amount : Float;
        user : Principal;
        status : {
          #pending;
          #verified;
        };
        timestamp : Int;
      }>();
      orders = List.empty<{
        orderId : Text;
        serviceId : Text;
        link : Text;
        quantity : Nat;
        cost : Float;
        status : {
          #pending;
          #completed;
          #failed;
        };
        timestamp : Int;
        apiOrderId : Text;
        user : Principal;
      }>();
      lowBalanceThreshold = lowBalanceThresholdDefault;
      nextOrderId = 1;
    };
  };
};
