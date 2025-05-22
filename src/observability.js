// src/observability.js
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { JaegerExporter }    = require('@opentelemetry/exporter-jaeger');

// 1) Exporter Prometheus pour les métriques (port 9464)
const promExporter = new PrometheusExporter({ port: 9464 });

// 2) Exporter Jaeger pour les traces (agent UDP par défaut sur localhost:6831)
const jaegerExporter = new JaegerExporter({
  serviceName: 'todo-api',
  // vous pouvez préciser host/port ou endpoint HTTP si besoin :
  // agentHost: process.env.JAEGER_AGENT_HOST || 'jaeger',
  // agentPort: process.env.JAEGER_AGENT_PORT || 6831,
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,   // traces → Jaeger
  metricReader: promExporter,       // métriques → Prometheus
  instrumentations: [ getNodeAutoInstrumentations() ],
});

try {
  sdk.start();    // démarre OTel SDK
  console.log(JSON.stringify({
    level: 'info',
    message: '✅ OpenTelemetry initialized',
    timestamp: new Date().toISOString()
  }));
} catch(err) {
  console.error(JSON.stringify({
    level: 'error',
    message: '❌ OpenTelemetry failed to start',
    error: err.message,
    timestamp: new Date().toISOString()
  }));
}
