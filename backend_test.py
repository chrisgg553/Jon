#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class ModZoneAPITester:
    def __init__(self, base_url="https://mod-marketplace-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.cookies = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from environment
        self.admin_email = "chrisguevarap805@gmail.com"
        self.admin_password = "Hups2020!?"

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, cookies=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, cookies=cookies or self.cookies)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, cookies=cookies or self.cookies)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, cookies=cookies or self.cookies)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, cookies=cookies or self.cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text[:200]}", "DEBUG")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_admin_login(self):
        """Test admin login and get auth cookies"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.admin_email, "password": self.admin_password}
        )
        
        if success and 'id' in response:
            # Store cookies for subsequent requests
            login_response = requests.post(
                f"{self.api_url}/auth/login",
                json={"email": self.admin_email, "password": self.admin_password},
                headers={'Content-Type': 'application/json'}
            )
            self.cookies = login_response.cookies
            self.log("Admin authentication successful", "INFO")
            return True, response
        return False, {}

    def test_auth_me(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_products_list(self):
        """Test getting all products"""
        success, response = self.run_test("Get All Products", "GET", "products", 200)
        if success:
            products_count = len(response) if isinstance(response, list) else 0
            self.log(f"Found {products_count} products", "INFO")
            if products_count >= 13:  # Should have 13 seeded products
                self.log("✅ Expected number of products found", "PASS")
                return True, response
            else:
                self.log(f"❌ Expected 13 products, found {products_count}", "FAIL")
                return False, response
        return False, {}

    def test_products_by_category(self):
        """Test category filtering"""
        categories = ['instagram', 'ps5', 'xbox', 'saves', 'accounts']
        all_passed = True
        
        for category in categories:
            success, response = self.run_test(
                f"Get {category.upper()} Products",
                "GET",
                f"products?category={category}",
                200
            )
            if success:
                count = len(response) if isinstance(response, list) else 0
                self.log(f"Found {count} products in {category} category", "INFO")
            else:
                all_passed = False
        
        return all_passed, {}

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "subject": "Test Message",
            "message": "This is a test message from automated testing."
        }
        
        success, response = self.run_test(
            "Contact Form Submission",
            "POST",
            "contact",
            200,
            data=contact_data
        )
        
        if success and 'id' in response:
            self.log(f"Contact message created with ID: {response.get('id', 'unknown')}", "INFO")
            return True, response
        return False, {}

    def test_order_creation(self):
        """Test manual order creation"""
        order_data = {
            "items": [
                {
                    "product_id": "test-product-1",
                    "product_name": "Test Product",
                    "quantity": 1,
                    "price": 9.99
                }
            ],
            "customer_email": "test@example.com",
            "customer_name": "Test Customer",
            "payment_method": "zelle",
            "total": 9.99
        }
        
        success, response = self.run_test(
            "Create Manual Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.log(f"Order created with ID: {response.get('id', 'unknown')}", "INFO")
            return True, response
        return False, {}

    def test_admin_stats(self):
        """Test admin dashboard stats"""
        return self.run_test("Admin Dashboard Stats", "GET", "admin/stats", 200)

    def test_admin_orders(self):
        """Test admin orders list"""
        success, response = self.run_test("Admin Orders List", "GET", "orders", 200)
        if success:
            orders_count = len(response) if isinstance(response, list) else 0
            self.log(f"Found {orders_count} orders", "INFO")
        return success, response

    def test_admin_customers(self):
        """Test admin customers list"""
        success, response = self.run_test("Admin Customers List", "GET", "customers", 200)
        if success:
            customers_count = len(response) if isinstance(response, list) else 0
            self.log(f"Found {customers_count} customers", "INFO")
        return success, response

    def test_admin_payments(self):
        """Test admin payments list"""
        success, response = self.run_test("Admin Payments List", "GET", "payments", 200)
        if success:
            payments_count = len(response) if isinstance(response, list) else 0
            self.log(f"Found {payments_count} payments", "INFO")
        return success, response

    def test_admin_messages(self):
        """Test admin contact messages"""
        success, response = self.run_test("Admin Contact Messages", "GET", "contact", 200)
        if success:
            messages_count = len(response) if isinstance(response, list) else 0
            self.log(f"Found {messages_count} contact messages", "INFO")
        return success, response

    def test_stripe_checkout_creation(self):
        """Test Stripe checkout session creation"""
        checkout_data = {
            "items": [
                {
                    "product_id": "test-product-1",
                    "product_name": "Test Product",
                    "quantity": 1,
                    "price": 9.99
                }
            ],
            "customer_email": "test@example.com",
            "customer_name": "Test Customer",
            "origin_url": self.base_url
        }
        
        success, response = self.run_test(
            "Stripe Checkout Creation",
            "POST",
            "payments/checkout",
            200,
            data=checkout_data
        )
        
        if success and 'url' in response:
            self.log(f"Stripe checkout URL created: {response.get('url', 'unknown')[:50]}...", "INFO")
            return True, response
        return False, {}

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting ModZone API Tests", "INFO")
        self.log(f"Testing against: {self.base_url}", "INFO")
        
        # Basic health check
        self.test_health_check()
        
        # Authentication tests
        login_success, _ = self.test_admin_login()
        if login_success:
            self.test_auth_me()
        
        # Public API tests
        self.test_products_list()
        self.test_products_by_category()
        self.test_contact_form()
        self.test_order_creation()
        
        # Stripe integration test
        self.test_stripe_checkout_creation()
        
        # Admin-only tests (require authentication)
        if login_success:
            self.test_admin_stats()
            self.test_admin_orders()
            self.test_admin_customers()
            self.test_admin_payments()
            self.test_admin_messages()
        
        # Print summary
        self.log("=" * 50, "INFO")
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run} passed", "INFO")
        
        if self.failed_tests:
            self.log("Failed tests:", "ERROR")
            for failure in self.failed_tests:
                self.log(f"  - {failure.get('test', 'Unknown')}: {failure}", "ERROR")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%", "INFO")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ModZoneAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())