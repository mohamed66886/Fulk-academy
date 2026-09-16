const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Since we are inside the user's project, we can try to require the admin init if it works
try {
  require("ts-node/register");
  const { adminDb } = require("./src/lib/firebase/admin");

  async function test() {
    const teachersSnap = await adminDb.collection("teachers").limit(1).get();
    if (teachersSnap.empty) {
      console.log("No teachers found");
      return;
    }
    const teacherRef = teachersSnap.docs[0].ref;
    console.log("Teacher:", teacherRef.id);

    let query = teacherRef.collection("students").where("deletedAt", "==", null);
    const snap1 = await query.get();
    console.log("Students with deletedAt==null:", snap1.docs.length);

    let pagedQuery = query.orderBy("createdAt", "desc");
    try {
      const snap2 = await pagedQuery.limit(20).get();
      console.log("Students with orderBy:", snap2.docs.length);
    } catch (e) {
      console.log("Error with orderBy:", e.message);
    }
  }
  test().catch(console.error);
} catch (e) {
  console.log("Failed to run test script", e);
}
