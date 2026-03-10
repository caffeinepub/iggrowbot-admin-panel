import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface IggrowbotApiCredentials {
    apiKey: string;
    apiUrl: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface OrderRecord {
    status: OrderStatus;
    cost: number;
    link: string;
    user: Principal;
    orderId: string;
    timestamp: bigint;
    quantity: bigint;
    serviceId: string;
    apiOrderId: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface PaymentRecord {
    utr: string;
    status: PaymentStatus;
    user: Principal;
    timestamp: bigint;
    amount: number;
}
export interface IggrowbotService {
    id: string;
    max: bigint;
    min: bigint;
    name: string;
    rate: number;
    description: string;
    category: string;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum OrderStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum PaymentStatus {
    verified = "verified",
    pending = "pending"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    creditUser(user: Principal, amount: number): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCredentials(): Promise<IggrowbotApiCredentials>;
    getLowBalanceThreshold(): Promise<number>;
    getMyOrders(): Promise<Array<OrderRecord>>;
    getMyPayments(): Promise<Array<PaymentRecord>>;
    getOrderAmount(orderId: string): Promise<number>;
    getPendingPayments(): Promise<Array<PaymentRecord>>;
    getServices(): Promise<Array<IggrowbotService>>;
    getUserBalance(): Promise<number>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isConfigured(): Promise<boolean>;
    isLowBalance(): Promise<boolean>;
    placeOrder(serviceId: string, link: string, quantity: bigint): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveCredentials(apiUrl: string, apiKey: string): Promise<void>;
    setLowBalanceThreshold(threshold: number): Promise<void>;
    submitPayment(utr: string, amount: number): Promise<void>;
    syncServices(): Promise<void>;
    bulkSetServices(services: Array<IggrowbotService>): Promise<void>;
    clearServices(): Promise<void>;
    toggleLowBalanceAlert(): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    verifyPayment(utr: string): Promise<void>;
    adminManualCredit(utrInput: string, amount: number, user: Principal): Promise<void>;
}
