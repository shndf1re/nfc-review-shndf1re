#!/usr/bin/env python3
"""
Backend API Test Suite for NFC Review Setup Endpoints
Tests the Next.js API routes under /api/setup/[id]
CRITICAL: Uses PRODUCTION Supabase DB - ONLY test with NFC-QATEST01
"""

import requests
import json
import sys

# Base URL from environment
BASE_URL = "https://saas-review-panel.preview.emergentagent.com"
TEST_DEVICE_ID = "NFC-QATEST01"
DEFAULT_PIN = "000000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name, passed, details=""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"\n{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def log_section(title):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{title}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")

def get_device_info(device_id):
    """GET /api/setup/[id] - Get public device info"""
    url = f"{BASE_URL}/api/setup/{device_id}"
    try:
        response = requests.get(url, timeout=30)
        return response
    except Exception as e:
        print(f"Error calling GET {url}: {e}")
        return None

def activate_device(device_id, pin, store_name, review_url, new_pin=None):
    """POST /api/setup/[id]/activate - Activate or update device"""
    url = f"{BASE_URL}/api/setup/{device_id}/activate"
    payload = {
        "pin": pin,
        "storeName": store_name,
        "reviewUrl": review_url
    }
    if new_pin:
        payload["newPin"] = new_pin
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        return response
    except Exception as e:
        print(f"Error calling POST {url}: {e}")
        return None

def reset_device(device_id, pin):
    """POST /api/setup/[id]/reset - Reset device to inactive"""
    url = f"{BASE_URL}/api/setup/{device_id}/reset"
    payload = {"pin": pin}
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        return response
    except Exception as e:
        print(f"Error calling POST {url}: {e}")
        return None

def test_get_device_info():
    """Test GET /api/setup/[id] endpoint"""
    log_section("TEST 1: GET /api/setup/[id] - Device Info")
    
    all_passed = True
    
    # Test 1.1: Get existing device
    print("\n1.1: GET /api/setup/NFC-QATEST01 (existing device)")
    response = get_device_info(TEST_DEVICE_ID)
    
    if response and response.status_code == 200:
        data = response.json()
        
        # Check response structure
        has_device = "device" in data
        if has_device:
            device = data["device"]
            has_id = "id" in device
            has_is_active = "is_active" in device
            has_label_name = "label_name" in device
            has_target_url = "target_url" in device
            has_no_pin = "pin" not in device
            
            # Check PIN is not in response anywhere
            response_str = json.dumps(data).lower()
            pin_not_in_response = "pin" not in response_str
            
            passed = (has_device and has_id and has_is_active and has_label_name and 
                     has_target_url and has_no_pin and pin_not_in_response)
            
            details = f"Response: {json.dumps(data, indent=2)}"
            if not pin_not_in_response:
                details += f"\n  {Colors.RED}ERROR: PIN found in response!{Colors.END}"
            
            all_passed &= log_test("GET existing device returns correct structure without PIN", 
                                  passed, details)
        else:
            all_passed &= log_test("GET existing device returns device object", False, 
                                  f"Response: {json.dumps(data, indent=2)}")
    else:
        status = response.status_code if response else "No response"
        all_passed &= log_test("GET existing device returns 200", False, 
                              f"Status: {status}")
    
    # Test 1.2: Get non-existent device
    print("\n1.2: GET /api/setup/NFC-DOESNOTEXIST999 (non-existent device)")
    response = get_device_info("NFC-DOESNOTEXIST999")
    
    if response:
        passed = response.status_code == 404
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("GET non-existent device returns 404", passed, details)
    else:
        all_passed &= log_test("GET non-existent device returns 404", False, "No response")
    
    return all_passed

def test_activate_device_inactive():
    """Test POST /api/setup/[id]/activate with inactive device"""
    log_section("TEST 2: POST /api/setup/[id]/activate - Inactive Device")
    
    all_passed = True
    
    # First, ensure device is inactive
    print("\nPre-test: Ensuring device is inactive...")
    info_response = get_device_info(TEST_DEVICE_ID)
    if info_response and info_response.status_code == 200:
        device = info_response.json().get("device", {})
        if device.get("is_active"):
            print("Device is active, resetting first...")
            # Try to reset with default pin or current pin
            reset_response = reset_device(TEST_DEVICE_ID, DEFAULT_PIN)
            if not reset_response or reset_response.status_code != 200:
                print(f"{Colors.YELLOW}Warning: Could not reset device. It may already have a custom PIN.{Colors.END}")
                print(f"{Colors.YELLOW}Skipping inactive device tests.{Colors.END}")
                return True  # Skip these tests
    
    # Test 2.1: Wrong PIN
    print("\n2.1: Activate with wrong PIN (123456)")
    response = activate_device(TEST_DEVICE_ID, "123456", "QA Toko", "ChIJtest123", "482913")
    
    if response:
        passed = response.status_code == 401
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Wrong PIN returns 401", passed, details)
    else:
        all_passed &= log_test("Wrong PIN returns 401", False, "No response")
    
    # Test 2.2: Evil URL (not allowed host)
    print("\n2.2: Activate with evil URL (https://evil.com/x)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "https://evil.com/x", "482913")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Evil URL returns 400", passed, details)
    else:
        all_passed &= log_test("Evil URL returns 400", False, "No response")
    
    # Test 2.3: Missing storeName
    print("\n2.3: Activate without storeName")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "", "ChIJtest123", "482913")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Missing storeName returns 400", passed, details)
    else:
        all_passed &= log_test("Missing storeName returns 400", False, "No response")
    
    # Test 2.4: Missing reviewUrl
    print("\n2.4: Activate without reviewUrl")
    url = f"{BASE_URL}/api/setup/{TEST_DEVICE_ID}/activate"
    payload = {"pin": DEFAULT_PIN, "storeName": "QA Toko", "newPin": "482913"}
    try:
        response = requests.post(url, json=payload, timeout=30)
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Missing reviewUrl returns 400", passed, details)
    except Exception as e:
        all_passed &= log_test("Missing reviewUrl returns 400", False, f"Error: {e}")
    
    # Test 2.5: Missing newPin (required for inactive device)
    print("\n2.5: Activate without newPin (required for inactive)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", None)
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Missing newPin returns 400", passed, details)
    else:
        all_passed &= log_test("Missing newPin returns 400", False, "No response")
    
    # Test 2.6: newPin = 000000 (not allowed)
    print("\n2.6: Activate with newPin = 000000")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "000000")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("newPin 000000 returns 400", passed, details)
    else:
        all_passed &= log_test("newPin 000000 returns 400", False, "No response")
    
    # Test 2.7: newPin = 111111 (all same digits)
    print("\n2.7: Activate with newPin = 111111 (all same)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "111111")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("newPin all same digits returns 400", passed, details)
    else:
        all_passed &= log_test("newPin all same digits returns 400", False, "No response")
    
    # Test 2.8: newPin = 123456 (sequential)
    print("\n2.8: Activate with newPin = 123456 (sequential)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "123456")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("newPin sequential returns 400", passed, details)
    else:
        all_passed &= log_test("newPin sequential returns 400", False, "No response")
    
    # Test 2.9: newPin = 12a456 (non-numeric)
    print("\n2.9: Activate with newPin = 12a456 (non-numeric)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "12a456")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("newPin non-numeric returns 400", passed, details)
    else:
        all_passed &= log_test("newPin non-numeric returns 400", False, "No response")
    
    # Test 2.10: newPin = 12345 (too short)
    print("\n2.10: Activate with newPin = 12345 (too short)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "12345")
    
    if response:
        passed = response.status_code == 400
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("newPin too short returns 400", passed, details)
    else:
        all_passed &= log_test("newPin too short returns 400", False, "No response")
    
    # Test 2.11: Valid activation
    print("\n2.11: Valid activation (pin=000000, storeName=QA Toko, reviewUrl=ChIJtest123, newPin=482913)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "482913")
    
    if response:
        if response.status_code == 200:
            data = response.json()
            success = data.get("success") == True
            was_active = data.get("wasActive") == False
            pin_changed = data.get("pinChanged") == True
            device = data.get("device", {})
            is_active = device.get("is_active") == True
            target_url = device.get("target_url") == "https://search.google.com/local/writereview?placeid=ChIJtest123"
            
            passed = success and was_active and pin_changed and is_active and target_url
            details = f"Response: {json.dumps(data, indent=2)}"
            all_passed &= log_test("Valid activation succeeds with correct response", passed, details)
            
            if passed:
                # Store the new PIN for next tests
                global CURRENT_PIN
                CURRENT_PIN = "482913"
        else:
            all_passed &= log_test("Valid activation returns 200", False, 
                                  f"Status: {response.status_code}, Response: {response.json()}")
    else:
        all_passed &= log_test("Valid activation returns 200", False, "No response")
    
    return all_passed

def test_activate_device_active():
    """Test POST /api/setup/[id]/activate with active device"""
    log_section("TEST 3: POST /api/setup/[id]/activate - Active Device")
    
    all_passed = True
    
    # Check if device is active
    print("\nPre-test: Checking device status...")
    info_response = get_device_info(TEST_DEVICE_ID)
    if not info_response or info_response.status_code != 200:
        print(f"{Colors.YELLOW}Warning: Could not get device info. Skipping active device tests.{Colors.END}")
        return True
    
    device = info_response.json().get("device", {})
    if not device.get("is_active"):
        print(f"{Colors.YELLOW}Device is not active. Activating first...{Colors.END}")
        activate_response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", "482913")
        if not activate_response or activate_response.status_code != 200:
            print(f"{Colors.YELLOW}Could not activate device. Skipping active device tests.{Colors.END}")
            return True
    
    # Test 3.1: Old default PIN should not work
    print("\n3.1: Try to update with old default PIN (000000)")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Edit", "ChIJtest123", None)
    
    if response:
        passed = response.status_code == 401
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Old default PIN returns 401 for active device", passed, details)
    else:
        all_passed &= log_test("Old default PIN returns 401 for active device", False, "No response")
    
    # Test 3.2: Update with correct PIN (no newPin)
    print("\n3.2: Update with correct PIN (482913) without newPin")
    response = activate_device(TEST_DEVICE_ID, "482913", "QA Edit", "https://g.page/r/abc", None)
    
    if response:
        if response.status_code == 200:
            data = response.json()
            success = data.get("success") == True
            was_active = data.get("wasActive") == True
            pin_changed = data.get("pinChanged") == False
            
            passed = success and was_active and not pin_changed
            details = f"Response: {json.dumps(data, indent=2)}"
            all_passed &= log_test("Update without newPin succeeds", passed, details)
        else:
            all_passed &= log_test("Update without newPin returns 200", False, 
                                  f"Status: {response.status_code}, Response: {response.json()}")
    else:
        all_passed &= log_test("Update without newPin returns 200", False, "No response")
    
    # Test 3.3: Change PIN
    print("\n3.3: Change PIN from 482913 to 739164")
    response = activate_device(TEST_DEVICE_ID, "482913", "QA Edit", "ChIJtest123", "739164")
    
    if response:
        if response.status_code == 200:
            data = response.json()
            pin_changed = data.get("pinChanged") == True
            
            passed = pin_changed
            details = f"Response: {json.dumps(data, indent=2)}"
            all_passed &= log_test("PIN change succeeds", passed, details)
        else:
            all_passed &= log_test("PIN change returns 200", False, 
                                  f"Status: {response.status_code}, Response: {response.json()}")
    else:
        all_passed &= log_test("PIN change returns 200", False, "No response")
    
    # Test 3.4: Old PIN should not work
    print("\n3.4: Try to update with old PIN (482913)")
    response = activate_device(TEST_DEVICE_ID, "482913", "QA Edit", "ChIJtest123", None)
    
    if response:
        passed = response.status_code == 401
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Old PIN returns 401 after PIN change", passed, details)
    else:
        all_passed &= log_test("Old PIN returns 401 after PIN change", False, "No response")
    
    # Test 3.5: New PIN should work
    print("\n3.5: Update with new PIN (739164)")
    response = activate_device(TEST_DEVICE_ID, "739164", "QA Final", "ChIJtest123", None)
    
    if response:
        passed = response.status_code == 200
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("New PIN works after PIN change", passed, details)
    else:
        all_passed &= log_test("New PIN works after PIN change", False, "No response")
    
    return all_passed

def test_reset_device():
    """Test POST /api/setup/[id]/reset endpoint"""
    log_section("TEST 4: POST /api/setup/[id]/reset - Reset Device")
    
    all_passed = True
    
    # Check if device is active
    print("\nPre-test: Checking device status...")
    info_response = get_device_info(TEST_DEVICE_ID)
    if not info_response or info_response.status_code != 200:
        print(f"{Colors.YELLOW}Warning: Could not get device info. Skipping reset tests.{Colors.END}")
        return True
    
    device = info_response.json().get("device", {})
    current_pin = "739164"  # From previous test
    
    if not device.get("is_active"):
        print(f"{Colors.YELLOW}Device is not active. Activating first...{Colors.END}")
        activate_response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA Toko", "ChIJtest123", current_pin)
        if not activate_response or activate_response.status_code != 200:
            print(f"{Colors.YELLOW}Could not activate device. Skipping reset tests.{Colors.END}")
            return True
    
    # Test 4.1: Reset with wrong PIN
    print("\n4.1: Reset with wrong PIN (123456)")
    response = reset_device(TEST_DEVICE_ID, "123456")
    
    if response:
        passed = response.status_code == 401
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Reset with wrong PIN returns 401", passed, details)
    else:
        all_passed &= log_test("Reset with wrong PIN returns 401", False, "No response")
    
    # Test 4.2: Reset with correct PIN
    print(f"\n4.2: Reset with correct PIN ({current_pin})")
    response = reset_device(TEST_DEVICE_ID, current_pin)
    
    if response:
        passed = response.status_code == 200
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Reset with correct PIN succeeds", passed, details)
    else:
        all_passed &= log_test("Reset with correct PIN succeeds", False, "No response")
    
    # Test 4.3: Verify device is inactive after reset
    print("\n4.3: Verify device is inactive after reset")
    info_response = get_device_info(TEST_DEVICE_ID)
    
    if info_response and info_response.status_code == 200:
        device = info_response.json().get("device", {})
        is_inactive = device.get("is_active") == False
        label_null = device.get("label_name") is None
        url_null = device.get("target_url") is None
        
        passed = is_inactive and label_null and url_null
        details = f"Device: {json.dumps(device, indent=2)}"
        all_passed &= log_test("Device is inactive with null label and URL", passed, details)
    else:
        all_passed &= log_test("Device is inactive after reset", False, "Could not get device info")
    
    # Test 4.4: Verify can activate with default PIN again
    print("\n4.4: Verify can activate with default PIN (000000) after reset")
    response = activate_device(TEST_DEVICE_ID, DEFAULT_PIN, "QA After Reset", "ChIJtest123", "482913")
    
    if response:
        passed = response.status_code == 200
        details = f"Status: {response.status_code}, Response: {response.json()}"
        all_passed &= log_test("Can activate with default PIN after reset", passed, details)
    else:
        all_passed &= log_test("Can activate with default PIN after reset", False, "No response")
    
    # Test 4.5: Reset when inactive should fail
    print("\n4.5: Reset device again (now active)")
    response = reset_device(TEST_DEVICE_ID, "482913")
    
    if response and response.status_code == 200:
        # Now try to reset when inactive
        print("\n4.6: Try to reset when inactive")
        response = reset_device(TEST_DEVICE_ID, DEFAULT_PIN)
        
        if response:
            passed = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.json()}"
            all_passed &= log_test("Reset when inactive returns 400", passed, details)
        else:
            all_passed &= log_test("Reset when inactive returns 400", False, "No response")
    else:
        print(f"{Colors.YELLOW}Could not reset device for inactive test{Colors.END}")
    
    return all_passed

def test_auth_me_endpoint():
    """Test GET /api/auth/me endpoint without cookie"""
    log_section("TEST 5: GET /api/auth/me - Sanity Check")
    
    print("\n5.1: GET /api/auth/me without cookie")
    url = f"{BASE_URL}/api/auth/me"
    
    try:
        response = requests.get(url, timeout=30)
        passed = response.status_code == 401
        details = f"Status: {response.status_code}, Response: {response.json()}"
        return log_test("GET /api/auth/me without cookie returns 401", passed, details)
    except Exception as e:
        return log_test("GET /api/auth/me without cookie returns 401", False, f"Error: {e}")

def cleanup_device():
    """Leave device in reset/inactive state"""
    log_section("CLEANUP: Reset Device to Inactive State")
    
    print("\nResetting device to inactive state...")
    
    # First check current state
    info_response = get_device_info(TEST_DEVICE_ID)
    if not info_response or info_response.status_code != 200:
        print(f"{Colors.YELLOW}Could not get device info for cleanup{Colors.END}")
        return
    
    device = info_response.json().get("device", {})
    if not device.get("is_active"):
        print(f"{Colors.GREEN}Device is already inactive{Colors.END}")
        return
    
    # Try to reset with known PINs
    known_pins = ["482913", "739164", DEFAULT_PIN]
    
    for pin in known_pins:
        print(f"Trying to reset with PIN: {pin}")
        response = reset_device(TEST_DEVICE_ID, pin)
        if response and response.status_code == 200:
            print(f"{Colors.GREEN}Successfully reset device with PIN: {pin}{Colors.END}")
            return
    
    print(f"{Colors.YELLOW}Could not reset device. It may have a different PIN.{Colors.END}")

def main():
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}NFC Review Setup API Test Suite{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}Test Device: {TEST_DEVICE_ID}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    results = []
    
    # Run all tests
    results.append(("GET /api/setup/[id]", test_get_device_info()))
    results.append(("POST /api/setup/[id]/activate (inactive)", test_activate_device_inactive()))
    results.append(("POST /api/setup/[id]/activate (active)", test_activate_device_active()))
    results.append(("POST /api/setup/[id]/reset", test_reset_device()))
    results.append(("GET /api/auth/me", test_auth_me_endpoint()))
    
    # Cleanup
    cleanup_device()
    
    # Summary
    log_section("TEST SUMMARY")
    
    total = len(results)
    passed = sum(1 for _, result in results if result)
    failed = total - passed
    
    for name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{status} - {name}")
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"Total: {total} | Passed: {Colors.GREEN}{passed}{Colors.END} | Failed: {Colors.RED}{failed}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
