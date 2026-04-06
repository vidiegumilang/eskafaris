import requests
import sys
import json
from datetime import datetime, timedelta

class FlightOpsAPITester:
    def __init__(self, base_url="https://flight-ops-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.student_id = None
        self.note_id = None
        self.announcement_id = None
        self.progress_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, files=files)
                else:
                    response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return response.content
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test login with admin credentials
        login_data = {
            "email": "admin@flightops.com",
            "password": "Admin123!"
        }
        
        result = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not result:
            print("❌ Login failed, stopping auth tests")
            return False
        
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        # Test register new user
        register_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "role": "instructor"
        }
        
        self.run_test(
            "Register New User",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        return True

    def test_instructors_crud(self):
        """Test instructors CRUD operations"""
        print("\n👨‍✈️ Testing Instructors CRUD...")
        
        # Get instructors
        instructors = self.run_test(
            "Get Instructors",
            "GET",
            "instructors",
            200
        )
        
        # Create instructor
        instructor_data = {
            "name": "Test Instructor",
            "callsign": "TEST01",
            "license_expiry": "2025-12-31"
        }
        
        created_instructor = self.run_test(
            "Create Instructor",
            "POST",
            "instructors",
            200,
            data=instructor_data
        )
        
        if created_instructor and created_instructor.get('id'):
            instructor_id = created_instructor['id']
            
            # Update instructor
            update_data = {
                "name": "Updated Test Instructor",
                "callsign": "UPDATED01"
            }
            
            self.run_test(
                "Update Instructor",
                "PUT",
                f"instructors/{instructor_id}",
                200,
                data=update_data
            )
            
            # Delete instructor (admin only)
            self.run_test(
                "Delete Instructor",
                "DELETE",
                f"instructors/{instructor_id}",
                200
            )

    def test_students_crud(self):
        """Test students CRUD operations"""
        print("\n🎓 Testing Students CRUD...")
        
        # Get students
        self.run_test(
            "Get Students",
            "GET",
            "students",
            200
        )
        
        # Create student
        student_data = {
            "name": "Test Student",
            "license_expiry": "2025-06-30"
        }
        
        created_student = self.run_test(
            "Create Student",
            "POST",
            "students",
            200,
            data=student_data
        )
        
        if created_student and created_student.get('id'):
            student_id = created_student['id']
            
            # Update student
            update_data = {
                "name": "Updated Test Student"
            }
            
            self.run_test(
                "Update Student",
                "PUT",
                f"students/{student_id}",
                200,
                data=update_data
            )
            
            # Delete student (admin only)
            self.run_test(
                "Delete Student",
                "DELETE",
                f"students/{student_id}",
                200
            )

    def test_aircraft_crud(self):
        """Test aircraft CRUD operations"""
        print("\n✈️ Testing Aircraft CRUD...")
        
        # Get aircraft
        self.run_test(
            "Get Aircraft",
            "GET",
            "aircraft",
            200
        )
        
        # Create aircraft
        aircraft_data = {
            "registration": "N12345",
            "status_hours": 150.5,
            "is_insured": True
        }
        
        created_aircraft = self.run_test(
            "Create Aircraft",
            "POST",
            "aircraft",
            200,
            data=aircraft_data
        )
        
        if created_aircraft and created_aircraft.get('id'):
            aircraft_id = created_aircraft['id']
            
            # Update aircraft
            update_data = {
                "status_hours": 200.0,
                "is_insured": False
            }
            
            self.run_test(
                "Update Aircraft",
                "PUT",
                f"aircraft/{aircraft_id}",
                200,
                data=update_data
            )
            
            # Delete aircraft (admin only)
            self.run_test(
                "Delete Aircraft",
                "DELETE",
                f"aircraft/{aircraft_id}",
                200
            )

    def test_stages_crud(self):
        """Test stages CRUD operations"""
        print("\n📚 Testing Stages CRUD...")
        
        # Get stages
        stages = self.run_test(
            "Get Stages",
            "GET",
            "stages",
            200
        )
        
        # Create stage (admin only)
        stage_data = {
            "name": "TEST_STAGE",
            "description": "Test training stage"
        }
        
        created_stage = self.run_test(
            "Create Stage",
            "POST",
            "stages",
            200,
            data=stage_data
        )
        
        if created_stage and created_stage.get('id'):
            stage_id = created_stage['id']
            
            # Update stage
            update_data = {
                "description": "Updated test training stage"
            }
            
            self.run_test(
                "Update Stage",
                "PUT",
                f"stages/{stage_id}",
                200,
                data=update_data
            )
            
            # Delete stage (admin only)
            self.run_test(
                "Delete Stage",
                "DELETE",
                f"stages/{stage_id}",
                200
            )

    def test_schedules_crud(self):
        """Test schedules CRUD operations"""
        print("\n📅 Testing Schedules CRUD...")
        
        # Get schedules
        self.run_test(
            "Get Schedules",
            "GET",
            "schedules",
            200
        )
        
        # Get schedules with date filter
        today = datetime.now().strftime('%Y-%m-%d')
        self.run_test(
            "Get Schedules with Date Filter",
            "GET",
            f"schedules?date={today}",
            200
        )
        
        # Create a simple schedule entry
        schedule_data = {
            "date": today,
            "period_number": 1,
            "aircraft_id": "test_aircraft_123",
            "instructor_callsign": "TEST01",
            "student_name": "Test Student",
            "exercise": "A1",
            "status": "scheduled"
        }
        
        created_schedule = self.run_test(
            "Create Schedule Entry",
            "POST",
            "schedules",
            200,
            data=schedule_data
        )
        
        if created_schedule and created_schedule.get('id'):
            schedule_id = created_schedule['id']
            
            # Update schedule
            update_data = {
                "status": "completed",
                "remarks": "Flight completed successfully"
            }
            
            self.run_test(
                "Update Schedule Entry",
                "PUT",
                f"schedules/{schedule_id}",
                200,
                data=update_data
            )
            
            # Delete schedule
            self.run_test(
                "Delete Schedule Entry",
                "DELETE",
                f"schedules/{schedule_id}",
                200
            )

    def test_courses_crud(self):
        """Test courses CRUD operations"""
        print("\n📚 Testing Courses CRUD...")
        
        # Get courses
        self.run_test(
            "Get Courses",
            "GET",
            "courses",
            200
        )
        
        # Create course
        course_data = {
            "name": "Test Course",
            "description": "Test flight training course"
        }
        
        created_course = self.run_test(
            "Create Course",
            "POST",
            "courses",
            200,
            data=course_data
        )
        
        if created_course and created_course.get('id'):
            course_id = created_course['id']
            
            # Update course
            update_data = {
                "description": "Updated test flight training course"
            }
            
            self.run_test(
                "Update Course",
                "PUT",
                f"courses/{course_id}",
                200,
                data=update_data
            )
            
            # Delete course
            self.run_test(
                "Delete Course",
                "DELETE",
                f"courses/{course_id}",
                200
            )

    def test_periods_endpoint(self):
        """Test periods endpoint"""
        print("\n⏰ Testing Periods...")
        
        periods = self.run_test(
            "Get Flight Periods",
            "GET",
            "periods",
            200
        )
        
        # Verify we get 10 periods
        if periods and len(periods) == 10:
            self.log_test("Periods Count Check", True, "Got 10 periods as expected")
        else:
            self.log_test("Periods Count Check", False, f"Expected 10 periods, got {len(periods) if periods else 0}")

    def test_batch_schedules(self):
        """Test batch schedules endpoint"""
        print("\n📦 Testing Batch Schedules...")
        
        today = datetime.now().strftime('%Y-%m-%d')
        batch_data = [
            {
                "date": today,
                "period_number": 1,
                "aircraft_id": "batch_test_aircraft_1",
                "instructor_callsign": "BATCH01",
                "student_name": "Batch Student 1",
                "exercise": "A1"
            },
            {
                "date": today,
                "period_number": 2,
                "aircraft_id": "batch_test_aircraft_2",
                "instructor_callsign": "BATCH02",
                "student_name": "Batch Student 2",
                "exercise": "A2"
            }
        ]
        
        self.run_test(
            "Batch Create/Update Schedules",
            "POST",
            "schedules/batch",
            200,
            data=batch_data
        )

    def test_daily_summary(self):
        """Test daily summary endpoint"""
        print("\n📊 Testing Daily Summary...")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get daily summary
        self.run_test(
            "Get Daily Summary",
            "GET",
            f"daily-summary/{today}",
            200
        )
        
        # Update daily summary
        summary_data = {
            "date": today,
            "weather_remarks": "Clear skies, good visibility",
            "total_sortie": 20,
            "sortie_available": 25
        }
        
        self.run_test(
            "Update Daily Summary",
            "POST",
            "daily-summary",
            200,
            data=summary_data
        )

    def test_notifications(self):
        """Test notifications endpoint"""
        print("\n🔔 Testing Notifications...")
        
        self.run_test(
            "Get Expiring Licenses",
            "GET",
            "notifications/expiring-licenses",
            200
        )

    def test_export_functionality(self):
        """Test export functionality"""
        print("\n📊 Testing Export...")
        
        # Test export schedules
        result = self.run_test(
            "Export Schedules",
            "GET",
            "export/schedules",
            200
        )
        
        # Check if we got Excel content
        if result and isinstance(result, bytes):
            self.log_test("Export Returns Excel Content", True, "Got binary content")
        else:
            self.log_test("Export Returns Excel Content", False, "No binary content")

    def test_import_functionality(self):
        """Test import functionality"""
        print("\n📥 Testing Import...")
        
        # Create a simple test Excel file content
        import io
        import pandas as pd
        
        # Test instructors import
        instructors_data = pd.DataFrame({
            'name': ['Import Test Instructor'],
            'callsign': ['IMP01'],
            'license_expiry': ['2025-12-31']
        })
        
        excel_buffer = io.BytesIO()
        instructors_data.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        
        files = {'file': ('test_instructors.xlsx', excel_buffer.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        self.run_test(
            "Import Instructors",
            "POST",
            "import/instructors",
            200,
            files=files
        )

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access...")
        
        # Test with instructor role
        instructor_data = {
            "email": f"instructor_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Instructor User",
            "role": "instructor"
        }
        
        # Register instructor
        instructor_result = self.run_test(
            "Register Instructor User",
            "POST",
            "auth/register",
            200,
            data=instructor_data
        )
        
        if instructor_result:
            # Try to delete something (should fail for instructor)
            self.run_test(
                "Instructor Delete Attempt (Should Fail)",
                "DELETE",
                "instructors/nonexistent_id",
                403  # Expecting forbidden
            )

    def test_flight_notes_crud(self):
        """Test Flight Notes CRUD operations"""
        print("\n📝 Testing Flight Notes CRUD...")
        
        # Get students first to use in notes
        response = self.run_test(
            "Get Students for Notes",
            "GET",
            "students",
            200
        )
        if response and isinstance(response, list) and len(response) > 0:
            self.student_id = response[0]['id']
            student_name = response[0]['name']
        else:
            self.log_test("Flight Notes Setup", False, "No students found")
            return
        
        # Create flight note
        note_data = {
            "student_id": self.student_id,
            "student_name": student_name,
            "exercise": "A5",
            "stage_name": "PPL",
            "note": "Good performance on basic maneuvers",
            "rating": "satisfactory",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = self.run_test(
            "Create Flight Note",
            "POST",
            "flight-notes",
            200,
            data=note_data
        )
        if response and 'id' in response:
            self.note_id = response['id']
        
        # Get flight notes
        self.run_test(
            "Get Flight Notes",
            "GET",
            "flight-notes",
            200
        )
        
        # Get flight notes filtered by student
        self.run_test(
            "Get Flight Notes by Student",
            "GET",
            f"flight-notes?student_id={self.student_id}",
            200
        )
        
        # Update flight note
        if self.note_id:
            self.run_test(
                "Update Flight Note",
                "PUT",
                f"flight-notes/{self.note_id}",
                200,
                data={"rating": "excellent", "note": "Updated: Excellent performance"}
            )
        
        # Delete flight note
        if self.note_id:
            self.run_test(
                "Delete Flight Note",
                "DELETE",
                f"flight-notes/{self.note_id}",
                200
            )

    def test_announcements_crud(self):
        """Test Announcements CRUD operations"""
        print("\n📢 Testing Announcements CRUD...")
        
        # Create announcement
        announcement_data = {
            "title": "Test Announcement",
            "content": "This is a test announcement for API testing",
            "priority": "important",
            "target_role": "all"
        }
        
        response = self.run_test(
            "Create Announcement",
            "POST",
            "announcements",
            200,
            data=announcement_data
        )
        if response and 'id' in response:
            self.announcement_id = response['id']
        
        # Get announcements
        self.run_test(
            "Get Announcements",
            "GET",
            "announcements",
            200
        )
        
        # Update announcement
        if self.announcement_id:
            self.run_test(
                "Update Announcement",
                "PUT",
                f"announcements/{self.announcement_id}",
                200,
                data={"priority": "urgent", "title": "Updated Test Announcement"}
            )
        
        # Delete announcement
        if self.announcement_id:
            self.run_test(
                "Delete Announcement",
                "DELETE",
                f"announcements/{self.announcement_id}",
                200
            )

    def test_student_progress(self):
        """Test Student Progress Tracker"""
        print("\n📊 Testing Student Progress...")
        
        if not self.student_id:
            # Get students if not already available
            response = self.run_test(
                "Get Students for Progress",
                "GET",
                "students",
                200
            )
            if response and isinstance(response, list) and len(response) > 0:
                self.student_id = response[0]['id']
        
        if not self.student_id:
            self.log_test("Student Progress Setup", False, "No students found")
            return
        
        # Get student progress
        self.run_test(
            "Get Student Progress",
            "GET",
            f"progress/{self.student_id}",
            200
        )
        
        # Mark exercise as completed
        progress_data = {
            "student_id": self.student_id,
            "stage_name": "PPL",
            "exercise": "A1",
            "completed_date": datetime.now().strftime("%Y-%m-%d"),
            "instructor_callsign": "TEST",
            "remarks": "Test completion"
        }
        
        response = self.run_test(
            "Mark Exercise Complete",
            "POST",
            "progress",
            200,
            data=progress_data
        )
        if response and 'id' in response:
            self.progress_id = response['id']
        
        # Delete progress entry
        if self.progress_id:
            self.run_test(
                "Delete Progress Entry",
                "DELETE",
                f"progress/{self.progress_id}",
                200
            )

    def test_whatsapp_share(self):
        """Test WhatsApp share functionality"""
        print("\n📱 Testing WhatsApp Share...")
        
        test_date = datetime.now().strftime("%Y-%m-%d")
        self.run_test(
            "Get WhatsApp Links",
            "GET",
            f"share/whatsapp/{test_date}",
            200
        )

    def test_email_notification(self):
        """Test email notification (should return 503 as Gmail not configured)"""
        print("\n📧 Testing Email Notification...")
        
        email_data = {
            "to_email": "test@example.com",
            "subject": "Test Email",
            "body": "This is a test email"
        }
        
        self.run_test(
            "Send Email Notification (Expected 503)",
            "POST",
            "notifications/send-email",
            503,  # Expected to fail as Gmail not configured
            data=email_data
        )

    def test_stages_with_substages(self):
        """Test that stages now have sub_stages"""
        print("\n🎯 Testing Stages with Sub-stages...")
        
        response = self.run_test(
            "Get Stages with Sub-stages",
            "GET",
            "stages",
            200
        )
        
        if response and isinstance(response, list):
            substages_found = False
            for stage in response:
                if 'sub_stages' in stage and stage['sub_stages']:
                    substages_found = True
                    self.log_test(f"Stage {stage['name']} has sub_stages", True, f"{len(stage['sub_stages'])} sub-stages")
                    break
            
            if not substages_found:
                self.log_test("Stages Sub-stages Check", False, "No stages with sub_stages found")

    def test_phone_fields(self):
        """Test that instructors and students have phone fields"""
        print("\n📞 Testing Phone Fields...")
        
        # Test instructors phone field
        response = self.run_test(
            "Get Instructors (Check Phone Field)",
            "GET",
            "instructors",
            200
        )
        
        if response and isinstance(response, list) and len(response) > 0:
            instructor = response[0]
            if 'phone' in instructor:
                self.log_test("Instructors have phone field", True)
            else:
                self.log_test("Instructors have phone field", False, "Phone field missing")
        
        # Test students phone field
        response = self.run_test(
            "Get Students (Check Phone Field)",
            "GET",
            "students",
            200
        )
        
        if response and isinstance(response, list) and len(response) > 0:
            student = response[0]
            if 'phone' in student:
                self.log_test("Students have phone field", True)
            else:
                self.log_test("Students have phone field", False, "Phone field missing")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Flight Operations API Testing...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_auth_flow():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Run all CRUD tests
        self.test_instructors_crud()
        self.test_students_crud()
        self.test_aircraft_crud()
        self.test_stages_crud()
        self.test_courses_crud()
        self.test_schedules_crud()
        
        # Test additional features
        self.test_periods_endpoint()
        self.test_batch_schedules()
        self.test_daily_summary()
        self.test_notifications()
        self.test_export_functionality()
        self.test_import_functionality()
        self.test_role_based_access()
        
        # Test new features (iteration 2)
        self.test_flight_notes_crud()
        self.test_announcements_crud()
        self.test_student_progress()
        self.test_whatsapp_share()
        self.test_email_notification()
        self.test_stages_with_substages()
        self.test_phone_fields()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Test logout
        self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        
        return self.tests_passed > 0

def main():
    tester = FlightOpsAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())