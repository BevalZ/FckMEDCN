const SURNAMES = ['林', '陈', '周', '许', '沈', '江', '顾', '宋', '叶', '程', '陆', '唐', '苏', '梁', '韩', '邵', '蒋', '谢', '杜', '彭'];
const GIVEN_NAMES = ['安', '宁', '然', '越', '清', '遥', '川', '言', '岚', '晨', '舟', '禾', '嘉', '衡', '昕', '妍', '哲', '琪', '睿', '舒', '博', '月', '诚', '雪'];

export const NPC_IDENTITY_IDS = [
  'roommate', 'senior', 'teacher', 'counselor', 'attending', 'headnurse', 'fellow', 'advisor',
  'career_peer', 'resident_chief', 'ward_nurse', 'medical_admin', 'lab_doctor', 'radiologist',
  'junior_doctor', 'department_chief', 'pharmacist', 'patient_liaison', 'community_doctor', 'conference_peer',
  'classmate_topper', 'classmate_slacker', 'anatomy_ta', 'library_partner', 'student_union_rep',
  'scholarship_peer', 'dorm_neighbor', 'sports_captain',
  'intern_peer', 'emergency_resident', 'scrub_nurse', 'anesthetist', 'ward_secretary', 'patient_family_rep',
  'co_resident', 'rotation_secretary', 'chief_resident', 'exam_partner', 'ultrasound_doctor',
  'blood_bank_doctor', 'night_shift_peer', 'outpatient_teacher',
  'lab_senior', 'lab_junior', 'statistician', 'ethics_secretary', 'animal_room_keeper',
  'platform_engineer', 'journal_editor_peer', 'grant_officer',
  'icu_consultant', 'infectious_consultant', 'cardiology_consultant', 'neuro_consultant',
  'oncology_doctor', 'pathologist', 'medical_insurance_officer', 'information_engineer',
  'social_worker', 'security_guard', 'hospital_accountant', 'device_engineer',
  'union_representative', 'teaching_secretary', 'graduate_student', 'visiting_scholar',
] as const;

export function generateNpcNames(random: () => number = Math.random): Record<string, string> {
  const used = new Set<string>();
  const result: Record<string, string> = {};
  for (const [index, id] of NPC_IDENTITY_IDS.entries()) {
    let name = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const surname = SURNAMES[Math.floor(random() * SURNAMES.length)];
      const first = GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length)];
      const second = random() < 0.42 ? GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length)] : '';
      name = surname + first + second;
      if (!used.has(name)) break;
    }
    if (used.has(name) || !name) {
      let fallbackIndex = index;
      do {
        name = SURNAMES[fallbackIndex % SURNAMES.length] + GIVEN_NAMES[Math.floor(fallbackIndex / SURNAMES.length) % GIVEN_NAMES.length];
        fallbackIndex++;
      } while (used.has(name));
    }
    used.add(name);
    result[id] = name;
  }
  return result;
}
