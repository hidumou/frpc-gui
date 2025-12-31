// Configuration state (参考 frpmgr/pkg/consts/state.go)
export enum ConfigState {
  Unknown = 0,
  Started = 1,
  Stopped = 2,
  Starting = 3,
  Stopping = 4,
}

// Proxy state
export enum ProxyState {
  Unknown = 0,
  Running = 1,
  Error = 2,
}

// Protocols (参考 frpmgr/pkg/consts/config.go)
export const Protocols = ['tcp', 'kcp', 'quic', 'websocket', 'wss'] as const
export type Protocol = (typeof Protocols)[number]

// Proxy types
export const ProxyTypes = [
  'tcp',
  'udp',
  'xtcp',
  'stcp',
  'sudp',
  'http',
  'https',
  'tcpmux',
] as const
export type ProxyType = (typeof ProxyTypes)[number]

// Plugin types
export const PluginTypes = [
  'http_proxy',
  'socks5',
  'static_file',
  'https2http',
  'https2https',
  'http2https',
  'http2http',
  'unix_domain_socket',
  'tls2raw',
] as const
export type PluginType = (typeof PluginTypes)[number]

// Auth methods
export const AuthMethods = ['token', 'oidc'] as const
export type AuthMethod = (typeof AuthMethods)[number]

// Log levels
export const LogLevels = ['trace', 'debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LogLevels)[number]

// Auth configuration
export interface AuthConfig {
  method: AuthMethod
  token?: string
  // OIDC configuration
  oidc?: {
    clientId?: string
    clientSecret?: string
    audience?: string
    scope?: string
    tokenEndpointUrl?: string
    additionalEndpointParams?: Record<string, string>
  }
}

// TLS configuration
export interface TLSConfig {
  enable?: boolean
  certFile?: string
  keyFile?: string
  trustedCaFile?: string
  serverName?: string
  disableCustomTLSFirstByte?: boolean
}

// Log configuration
export interface LogConfig {
  to?: string
  level?: LogLevel
  maxDays?: number
}

// Admin configuration
export interface AdminConfig {
  addr?: string
  port?: number
  user?: string
  pwd?: string
  tls?: TLSConfig
  assetsDir?: string
  pprofEnable?: boolean
}

// QUIC configuration
export interface QUICConfig {
  keepalivePeriod?: number
  maxIdleTimeout?: number
  maxIncomingStreams?: number
}

// Plugin parameters (参考 frpmgr/pkg/config/client.go)
export interface PluginParams {
  localAddr?: string
  crtPath?: string
  keyPath?: string
  hostHeaderRewrite?: string
  httpUser?: string
  httpPasswd?: string
  user?: string
  passwd?: string
  localPath?: string
  stripPrefix?: string
  unixPath?: string
  headers?: Record<string, string>
  enableHTTP2?: boolean
}

// Health check configuration
export interface HealthCheckConfig {
  type?: 'tcp' | 'http' | ''
  timeoutSeconds?: number
  maxFailed?: number
  intervalSeconds?: number
  url?: string
  httpHeaders?: Record<string, string>
}

// Proxy configuration (参考 frpmgr/pkg/config/client.go)
export interface Proxy {
  name: string
  type: ProxyType
  // Encryption and compression
  transport?: {
    useEncryption?: boolean
    useCompression?: boolean
    bandwidthLimit?: string
    bandwidthLimitMode?: 'client' | 'server'
    proxyProtocolVersion?: string
  }
  // Load balance
  loadBalancer?: {
    group?: string
    groupKey?: string
  }
  // Health check
  healthCheck?: HealthCheckConfig
  // Local config
  localIP?: string
  localPort?: string | number
  // Plugin config
  plugin?: {
    type?: PluginType | ''
    [key: string]: unknown
  } & PluginParams
  // TCP/UDP specific
  remotePort?: string | number
  // STCP/XTCP/SUDP specific
  secretKey?: string
  allowUsers?: string[]
  // Visitor specific
  role?: 'server' | 'visitor' | ''
  serverUser?: string
  serverName?: string
  bindAddr?: string
  bindPort?: number
  // XTCP visitor specific
  protocol?: string
  keepTunnelOpen?: boolean
  maxRetriesAnHour?: number
  minRetryInterval?: number
  fallbackTo?: string
  fallbackTimeoutMs?: number
  // HTTP/HTTPS/TCPMUX specific
  customDomains?: string[]
  subdomain?: string
  locations?: string[]
  httpUser?: string
  httpPwd?: string
  hostHeaderRewrite?: string
  headers?: Record<string, string>
  responseHeaders?: Record<string, string>
  routeByHTTPUser?: string
  // TCPMUX specific
  multiplexer?: string
  // Metadata
  metadatas?: Record<string, string>
  annotations?: Record<string, string>
  // UI state
  disabled?: boolean
}

// Client common configuration (参考 frpmgr/pkg/config/client.go)
export interface ClientCommon {
  serverAddr: string
  serverPort: number
  auth?: AuthConfig
  user?: string
  // Connection
  natHoleStunServer?: string
  dnsServer?: string
  loginFailExit?: boolean
  dialServerTimeout?: number
  dialServerKeepalive?: number
  connectServerLocalIP?: string
  httpProxy?: string
  // Transport
  protocol?: Protocol
  quic?: QUICConfig
  tls?: TLSConfig
  tcpMux?: boolean
  tcpMuxKeepaliveInterval?: number
  // Heartbeat
  heartbeatInterval?: number
  heartbeatTimeout?: number
  // Pool
  poolCount?: number
  udpPacketSize?: number
  // Log
  log?: LogConfig
  // Admin
  webServer?: AdminConfig
  // Metadata
  metadatas?: Record<string, string>
  // UI specific
  start?: string[]
}

// Visitor configuration (for stcp/xtcp visitors)
export interface Visitor {
  name: string
  type: 'stcp' | 'xtcp' | 'sudp'
  serverName: string
  secretKey?: string
  bindAddr?: string
  bindPort?: number
  // XTCP visitor specific
  protocol?: string
  keepTunnelOpen?: boolean
  maxRetriesAnHour?: number
  minRetryInterval?: number
  fallbackTo?: string
  fallbackTimeoutMs?: number
  // UI state
  disabled?: boolean
}

// Full client configuration
export interface ClientConfig {
  id: string
  name: string
  common: ClientCommon
  proxies: Proxy[]
  visitors?: Visitor[]
  // Manager specific
  manualStart?: boolean
  autoDelete?: {
    method?: 'absolute' | 'relative' | ''
    afterDays?: number
    afterDate?: string
  }
  // Runtime state
  state?: ConfigState
  path?: string
}

// App configuration
export interface AppConfig {
  lang?: string
  password?: string
  checkUpdate?: boolean
  defaults?: {
    protocol?: Protocol
    user?: string
    logLevel?: LogLevel
    logMaxDays?: number
    dnsServer?: string
    natHoleStunServer?: string
    connectServerLocalIP?: string
    tcpMux?: boolean
    tlsEnable?: boolean
    manualStart?: boolean
  }
}

// Proxy status info
export interface ProxyStatusInfo {
  name: string
  type: ProxyType
  status: ProxyState
  remoteAddr?: string
  error?: string
}
