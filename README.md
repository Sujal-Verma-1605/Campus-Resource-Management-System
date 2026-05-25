# Campus Resource Management System
Campus Resource Management System is a production-style, centralized academic administration and resource coordination platform designed for modern college/university environments. The system facilitates classroom allocation, conflict-free scheduling, exam tracking, student roster management, and live administrative analytics.
## Inspiration Mapping
This project borrows structural and engine concepts from several highly regarded open-source school management and scheduling platforms:
* **Tutor Scheduler System**: Serves as the inspiration for the overlap conflict checks, automatic recommendation algorithms, calendar listings rendering, and database scheduling indices mappings (`backend/services/scheduler.py`, `backend/routes/booking_routes.py`, `backend/models/booking.py`, `frontend/assets/js/booking.js`).
* **Django LMS**: Serves as the inspiration for the student directories layouts, course structures mapping, and dashboard charts aggregation services (`backend/models/user.py`, `backend/models/course.py`, `backend/routes/student_routes.py`, `backend/services/analytics.py`, `backend/templates/dashboard.html`, `frontend/assets/js/dashboard.js`).
* **Taqwa School Management System (Flask)**: Serves as the blueprint for the Flask app factory design, static uploads layout, multi-role auth session decorators, and templates structure (`backend/app.py`, `backend/config.py`, `backend/routes/auth_routes.py`, `backend/templates/login.html`).
---
## Features
1. **Multi-Role Portal Access**: Fully segregated access controls for Admins, Faculty, and Students.
2. **Conflict-Free Classroom Reservation**: Check classroom availability, reserve slots, and utilize the auto-allocation engine to find the best matching room by capacity.
3. **Interactive Admin Analytics**: Live metric cards displaying student counts, faculty logs, active rooms count, and calculated room utilization rates.
4. **Exams Coordination**: Schedule courses final assessments, define rooms, and assign faculty invigilators.
5. **Student Directories**: View and register students list by department.
