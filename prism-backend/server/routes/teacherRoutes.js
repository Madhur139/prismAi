/**
 * routes/teacherRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/teacher. Login required.
 * Most routes are for teachers only; joining a class is for students.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createClass,
  getMyClass,
  joinClass,
  assignLesson,
  listAssignments,
  deleteAssignment,
  getStudentStats,
} = require("../controllers/teacherController");
const {
  listClassrooms,
  createClassroom,
  updateClassroom,
  importRoster,
  getMyClassroom,
  getClassWeekly,
  getClassInsight,
} = require("../controllers/classroomController");

const router = express.Router();

router.use(protect);

router.get("/class", getMyClass);
router.post("/class", createClass);
router.post("/join", joinClass);
router.get("/assignments", listAssignments);
router.post("/assign", assignLesson);
router.delete("/assign/:id", deleteAssignment);
router.get("/students/:id", getStudentStats);

// --- named classes, rosters, reports ---
router.get("/classrooms", listClassrooms);
router.post("/classrooms", createClassroom);
router.patch("/classrooms/:id", updateClassroom);
router.post("/classrooms/:id/roster", importRoster);
router.get("/my-class", getMyClassroom); // the class a student belongs to
router.get("/weekly", getClassWeekly);
router.post("/insight", getClassInsight);

module.exports = router;
