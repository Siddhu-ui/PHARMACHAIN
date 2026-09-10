import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List

class MLAnomalyDetector:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLAnomalyDetector, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        """
        Initializes and trains Isolation Forest on baseline reverse logistics feature distributions.
        Features:
        [quantity_diff, handoff_delay_hours, scan_count, location_count, duplicate_scan_count, location_frequency]
        """
        np.random.seed(42)
        # 500 normal supply chain samples
        normal_qty_diff = np.random.exponential(scale=1.5, size=500)
        normal_delay_hours = np.random.gamma(shape=2, scale=12, size=500) # typical 24-48 hr handoffs
        normal_scans = np.random.randint(1, 5, size=500)
        normal_locations = np.random.randint(1, 4, size=500)
        normal_duplicates = np.zeros(500)
        normal_loc_freq = normal_locations / np.maximum(1, normal_scans)

        X_normal = np.column_stack([
            normal_qty_diff,
            normal_delay_hours,
            normal_scans,
            normal_locations,
            normal_duplicates,
            normal_loc_freq
        ])

        # 30 synthetic anomalies (spikes in delay, quantity discrepancies, duplicate scans)
        anom_qty_diff = np.random.uniform(20, 100, size=30)
        anom_delay_hours = np.random.uniform(120, 300, size=30)
        anom_scans = np.random.randint(6, 15, size=30)
        anom_locations = np.random.randint(4, 8, size=30)
        anom_duplicates = np.random.randint(2, 6, size=30)
        anom_loc_freq = anom_locations / np.maximum(1, anom_scans)

        X_anom = np.column_stack([
            anom_qty_diff,
            anom_delay_hours,
            anom_scans,
            anom_locations,
            anom_duplicates,
            anom_loc_freq
        ])

        X_train = np.vstack([X_normal, X_anom])
        self._model = IsolationForest(n_estimators=100, contamination=0.06, random_state=42)
        self._model.fit(X_train)

    def predict_anomaly(
        self,
        quantity_diff: float,
        handoff_delay_hours: float,
        scan_count: int,
        location_count: int,
        duplicate_scan_count: int = 0
    ) -> Dict[str, Any]:
        """
        Evaluates supply-chain handoff metrics and returns anomaly prediction and continuous score.
        """
        loc_freq = location_count / max(1, scan_count)
        feature_vector = np.array([[
            abs(quantity_diff),
            max(0.0, handoff_delay_hours),
            max(1, scan_count),
            max(1, location_count),
            max(0, duplicate_scan_count),
            loc_freq
        ]])

        prediction = self._model.predict(feature_vector)[0] # -1 for anomaly, 1 for normal
        raw_score = self._model.decision_function(feature_vector)[0]
        
        # Normalize score into 0.0 (normal) to 1.0 (severe anomaly)
        # raw_score is positive for inliers, negative for outliers
        norm_score = float(np.clip(1.0 - (raw_score + 0.3) / 0.6, 0.0, 1.0))
        is_anomaly = (prediction == -1) or (norm_score > 0.65) or (duplicate_scan_count > 0)

        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(norm_score, 3),
            "raw_decision": round(float(raw_score), 4)
        }

ml_detector = MLAnomalyDetector()
