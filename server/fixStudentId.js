const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/excelsiaedu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Student = mongoose.model('Student', new mongoose.Schema({
  nameZh: String,
  nameEn: String,
  grade: String,
  studentId: String,
  studentid: String,
}));

async function fixStudentIds() {
  const students = await Student.find({ studentid: { $exists: true } });
  for (const stu of students) {
    stu.studentId = stu.studentid;
    stu.studentid = undefined;
    await stu.save();
    console.log(`已修正: ${stu.nameZh}，studentId=${stu.studentId}`);
  }
  mongoose.disconnect();
}

fixStudentIds(); 