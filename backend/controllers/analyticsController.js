const Task = require('../models/Task');

/**
 * Get comprehensive analytics for assigned users
 * Shows: tasks assigned, completed on-time, completed late
 */
async function getAnalytics(req, res, next) {
  try {
    const userId = req.userId;
    console.log(`\n🔵 getAnalytics called for userId: ${userId}`);

    // Get all tasks where current user is creator
    const tasks = await Task.find({ createdBy: userId })
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name')
      .populate('completedBy.userId', 'name email');
      // NOTE: Removed .lean() to ensure proper population of nested documents

    console.log(`📦 Found ${tasks.length} tasks created by this user`);

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tasks found',
        analytics: {
          totalTasks: 0,
          userStats: [],
          summary: {
            totalAssignedTasks: 0,
            totalCompletedOnTime: 0,
            totalCompletedLate: 0,
            completionRate: 0,
          },
        },
      });
    }

    // Build analytics by collecting data for each assigned user
    const userStatsMap = new Map();

    tasks.forEach((task) => {
      console.log(`\n📋 Processing task: "${task.title}"`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Alarm: ${task.alarmTime}`);
      console.log(`   CompletedBy count: ${task.completedBy?.length || 0}`);
      
      // For each assigned user
      if (task.assignedUsers && task.assignedUsers.length > 0) {
        task.assignedUsers.forEach((assignedUser) => {
          const assignedUserId = assignedUser._id.toString();
          const userName = assignedUser.name;

          console.log(`   👤 Assigned to: ${userName} (${assignedUserId})`);

          if (!userStatsMap.has(assignedUserId)) {
            userStatsMap.set(assignedUserId, {
              userId: assignedUserId,
              userName,
              totalAssigned: 0,
              completedOnTime: 0,
              completedLate: 0,
              completedTotal: 0,
              pendingTasks: [],
              completedTasks: [],
              lateCompletedTasks: [],
            });
          }

          const stats = userStatsMap.get(assignedUserId);
          stats.totalAssigned += 1;

          // Check if this user completed the task
          const completion = task.completedBy?.find(
            (c) => {
              const cUserId = c.userId?._id?.toString() || c.userId?.toString();
              return cUserId === assignedUserId;
            }
          );

          console.log(`      Completion found? ${!!completion}`);

          if (completion) {
            stats.completedTotal += 1;

            // Check if completed on time or late
            const completedAt = new Date(completion.completedAt);
            const alarmTime = new Date(task.alarmTime);
            const fiveMinutesAfterAlarm = new Date(alarmTime.getTime() + 5 * 60000);
            const timeDiff = completedAt - alarmTime;
            const timeDiffMinutes = Math.floor(timeDiff / 60000);

            console.log(`      ⏰ Alarm: ${alarmTime.toISOString()}`);
            console.log(`      ⏰ Completed: ${completedAt.toISOString()}`);
            console.log(`      ⏰ Difference: ${timeDiffMinutes} minutes`);
            console.log(`      ⏰ 5-min window: ${fiveMinutesAfterAlarm.toISOString()}`);
            console.log(`      ⏰ completedAt <= fiveMinutesAfterAlarm? ${completedAt <= fiveMinutesAfterAlarm}`);

            if (completedAt <= fiveMinutesAfterAlarm) {
              // Completed within 5 minutes of alarm time = ON TIME
              console.log(`      ✅ ON-TIME (within 5 min window)`);
              stats.completedOnTime += 1;
              stats.completedTasks.push({
                taskId: task._id,
                taskTitle: task.title,
                alarmTime: task.alarmTime,
                completedAt: completion.completedAt,
                status: 'on-time',
                timeDifference: timeDiff,
              });
            } else {
              // Completed more than 5 minutes after alarm time = LATE
              console.log(`      ❌ LATE (${timeDiffMinutes} minutes past deadline)`);
              stats.completedLate += 1;
              stats.lateCompletedTasks.push({
                taskId: task._id,
                taskTitle: task.title,
                alarmTime: task.alarmTime,
                completedAt: completion.completedAt,
                status: 'late',
                timeDifference: timeDiff,
              });
            }
          } else {
            console.log(`      ⏳ Not completed yet`);
          }
        });
      }
    });

    // Calculate summary statistics
    // Convert map to array and sort by total assigned (descending)
    const userStats = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalAssigned - a.totalAssigned)
      .map((stat) => ({
        ...stat,
        completionRate: stat.totalAssigned > 0 
          ? ((stat.completedTotal / stat.totalAssigned) * 100).toFixed(1) 
          : 0,
        onTimeRate: stat.completedTotal > 0
          ? ((stat.completedOnTime / stat.completedTotal) * 100).toFixed(1)
          : 0,
      }));

    // Calculate overall summary
    const summary = userStats.reduce(
      (acc, stat) => ({
        totalAssignedTasks: acc.totalAssignedTasks + stat.totalAssigned,
        totalCompletedOnTime: acc.totalCompletedOnTime + stat.completedOnTime,
        totalCompletedLate: acc.totalCompletedLate + stat.completedLate,
      }),
      { totalAssignedTasks: 0, totalCompletedOnTime: 0, totalCompletedLate: 0 }
    );

    summary.completedTotal = summary.totalCompletedOnTime + summary.totalCompletedLate;
    summary.completionRate = summary.totalAssignedTasks > 0
      ? ((summary.completedTotal / summary.totalAssignedTasks) * 100).toFixed(1)
      : 0;

    console.log(`\n📊 ===== FINAL SUMMARY STATISTICS =====`);
    console.log(`   Total Assigned: ${summary.totalAssignedTasks}`);
    console.log(`   Total Completed: ${summary.completedTotal}`);
    console.log(`   ✅ On-Time: ${summary.totalCompletedOnTime}`);
    console.log(`   ❌ Late: ${summary.totalCompletedLate}`);
    console.log(`   📈 Completion Rate: ${summary.completionRate}%`);
    console.log(`🔵 getAnalytics complete\n`);

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      analytics: {
        totalTasks: tasks.length,
        userStats,
        summary,
      },
    });
  } catch (error) {
    console.error('❌ Error getting analytics:', error);
    next(error);
  }
}

module.exports = {
  getAnalytics,
};
