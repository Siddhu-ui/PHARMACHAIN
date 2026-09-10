import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_manufacturer_dashboard_endpoint():
    response = client.get("/api/dashboard/manufacturer")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    kpis = data["kpis"]
    assert "total_registered_products" in kpis
    assert "active_products" in kpis
    assert "expiring_soon" in kpis
    assert "expired_awaiting_return" in kpis
    assert "return_overdue" in kpis
    assert "awaiting_destruction" in kpis
    assert "destruction_verified" in kpis
    assert "fraud_incidents" in kpis
    assert isinstance(data.get("approaching_expiry"), list)
    assert isinstance(data.get("overdue_returns"), list)
    assert isinstance(data.get("destruction_pending"), list)
    assert isinstance(data.get("recent_fraud"), list)

def test_retailer_dashboard_endpoint():
    response = client.get("/api/dashboard/retailer")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    kpis = data["kpis"]
    assert "total_stock" in kpis
    assert "active_stock" in kpis
    assert "expiring_soon" in kpis
    assert "expired_stock" in kpis
    assert "return_pending" in kpis
    assert "products_verified_today" in kpis
    assert "suspicious_scans" in kpis
    assert isinstance(data.get("expiring_soon"), list)
    assert isinstance(data.get("expired_stock"), list)
    assert isinstance(data.get("recent_activity"), list)
    assert isinstance(data.get("suspicious_scans"), list)

def test_distributor_dashboard_endpoint():
    response = client.get("/api/dashboard/distributor")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    kpis = data["kpis"]
    assert "pickup_requests" in kpis
    assert "pickups_today" in kpis
    assert "in_transit" in kpis
    assert "delivered_to_manufacturer" in kpis
    assert "delayed_returns" in kpis
    assert "total_weight_collected" in kpis
    assert isinstance(data.get("pickup_requests"), list)
    assert isinstance(data.get("active_transport"), list)
