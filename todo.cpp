// ============================================================
//  To-Do List Management System
//  College Mini Project - C++ (C++11 or later)
//
//  Features:
//    - Add / edit / delete tasks
//    - Mark tasks as completed
//    - View all / pending / completed tasks
//    - Priority levels (High / Medium / Low)
//    - Due dates (YYYY-MM-DD) with overdue detection
//    - Search by keyword
//    - Sort by priority or due date
//    - Statistics summary
//    - Data saved to a file (tasks.txt) so it persists between runs
//
//  Compile:  g++ -std=c++11 -o todo todo.cpp
//  Run:      ./todo        (Windows: todo.exe)
// ============================================================

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

// ---------------------- Data Structure ----------------------

enum Priority { LOW = 1, MEDIUM = 2, HIGH = 3 };

struct Task {
    int id;
    string title;
    string description;
    Priority priority;
    string dueDate;   // format: YYYY-MM-DD (empty = no due date)
    bool completed;
};

// ---------------------- Helper Functions ----------------------

string priorityToString(Priority p) {
    switch (p) {
        case HIGH:   return "High";
        case MEDIUM: return "Medium";
        default:     return "Low";
    }
}

// Returns today's date as YYYY-MM-DD
string todayDate() {
    time_t now = time(nullptr);
    tm *lt = localtime(&now);
    char buf[16];
    strftime(buf, sizeof(buf), "%Y-%m-%d", lt);
    return string(buf);
}

// Basic validation for a YYYY-MM-DD date
bool isValidDate(const string &d) {
    if (d.size() != 10 || d[4] != '-' || d[7] != '-') return false;
    for (size_t i = 0; i < d.size(); i++) {
        if (i == 4 || i == 7) continue;
        if (d[i] < '0' || d[i] > '9') return false;
    }
    int year  = stoi(d.substr(0, 4));
    int month = stoi(d.substr(5, 2));
    int day   = stoi(d.substr(8, 2));
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) return false;

    int daysInMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    bool leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    if (leap) daysInMonth[1] = 29;
    return day <= daysInMonth[month - 1];
}

bool isOverdue(const Task &t) {
    // ISO dates compare correctly as plain strings
    return !t.completed && !t.dueDate.empty() && t.dueDate < todayDate();
}

string toLower(string s) {
    for (size_t i = 0; i < s.size(); i++)
        s[i] = static_cast<char>(tolower(static_cast<unsigned char>(s[i])));
    return s;
}

// Remove the '|' character so it doesn't break the save-file format
string sanitize(string s) {
    replace(s.begin(), s.end(), '|', '/');
    return s;
}

// (renamed from truncate: that name clashes with a POSIX function on some compilers)
string truncateText(const string &s, size_t n) {
    if (s.size() <= n) return s;
    return s.substr(0, n - 3) + "...";
}

// ---------------------- Safe Input Functions ----------------------

// Reads a line. If input ends (EOF / no real console), exits cleanly
// instead of looping forever.
string readLine(const string &prompt) {
    string line;
    cout << prompt << flush;
    if (!getline(cin, line)) {
        cout << "\n  Input closed. Exiting.\n";
        exit(0);
    }
    if (!line.empty() && line.back() == '\r') line.pop_back();  // Windows line endings
    return line;
}

// Keeps asking until the user enters an integer in [lo, hi]
int readInt(const string &prompt, int lo, int hi) {
    while (true) {
        string line = readLine(prompt);
        try {
            size_t pos;
            int val = stoi(line, &pos);
            if (pos == line.size() && val >= lo && val <= hi) return val;
        } catch (...) {
        }
        cout << "  Invalid input. Enter a number between " << lo << " and " << hi << ".\n";
    }
}

string readNonEmpty(const string &prompt) {
    while (true) {
        string s = readLine(prompt);
        if (!s.empty()) return sanitize(s);
        cout << "  This field cannot be empty.\n";
    }
}

string readDate(const string &prompt) {
    while (true) {
        string s = readLine(prompt);
        if (s.empty() || isValidDate(s)) return s;
        cout << "  Invalid date. Use YYYY-MM-DD (e.g. 2026-12-31) or leave blank.\n";
    }
}

Priority readPriority() {
    cout << "  Priority: 1) Low   2) Medium   3) High\n";
    return static_cast<Priority>(readInt("  Choose (1-3): ", 1, 3));
}

// ---------------------- ToDoManager Class ----------------------

class ToDoManager {
private:
    vector<Task> tasks;
    int nextId;
    string filename;

    int findIndexById(int id) const {
        for (size_t i = 0; i < tasks.size(); i++)
            if (tasks[i].id == id) return static_cast<int>(i);
        return -1;
    }

    void printHeader() const {
        cout << "\n"
             << left << setw(5) << "ID" << setw(24) << "Title" << setw(9) << "Priority"
             << setw(12) << "Due Date" << setw(12) << "Status" << "\n"
             << string(62, '-') << "\n";
    }

    void printRow(const Task &t) const {
        string status = t.completed ? "Done" : (isOverdue(t) ? "OVERDUE" : "Pending");
        cout << left << setw(5) << t.id << setw(24) << truncateText(t.title, 22)
             << setw(9) << priorityToString(t.priority)
             << setw(12) << (t.dueDate.empty() ? "-" : t.dueDate)
             << setw(12) << status << "\n";
    }

    void printList(const vector<const Task *> &list) const {
        if (list.empty()) {
            cout << "\n  No tasks to show.\n";
            return;
        }
        printHeader();
        for (size_t i = 0; i < list.size(); i++) printRow(*list[i]);
        cout << string(62, '-') << "\n  Total shown: " << list.size() << "\n";
    }

public:
    ToDoManager(const string &file) : nextId(1), filename(file) { load(); }

    // ---------- File handling ----------
    void load() {
        ifstream in(filename.c_str());
        if (!in) return;  // first run: no file yet

        string line;
        while (getline(in, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (line.empty()) continue;

            vector<string> parts;
            string part;
            stringstream ss(line);
            while (getline(ss, part, '|')) parts.push_back(part);
            if (line.back() == '|') parts.push_back("");  // trailing empty field
            if (parts.size() < 6) continue;               // skip corrupted lines

            try {
                Task t;
                t.id          = stoi(parts[0]);
                t.title       = parts[1];
                t.description = parts[2];
                int p         = stoi(parts[3]);
                if (p < 1 || p > 3) p = 1;
                t.priority    = static_cast<Priority>(p);
                t.dueDate     = parts[4];
                t.completed   = (parts[5] == "1");
                tasks.push_back(t);
                if (t.id >= nextId) nextId = t.id + 1;
            } catch (...) {
                // ignore bad line
            }
        }
    }

    void save() const {
        ofstream out(filename.c_str());
        if (!out) {
            cout << "  Warning: could not save to " << filename << "\n";
            return;
        }
        for (size_t i = 0; i < tasks.size(); i++) {
            const Task &t = tasks[i];
            out << t.id << '|' << t.title << '|' << t.description << '|'
                << static_cast<int>(t.priority) << '|' << t.dueDate << '|'
                << (t.completed ? 1 : 0) << '\n';
        }
    }

    // ---------- Core operations ----------
    void addTask() {
        cout << "\n--- Add New Task ---\n";
        Task t;
        t.id = nextId++;
        t.title = readNonEmpty("  Title: ");
        t.description = sanitize(readLine("  Description (optional): "));
        t.priority = readPriority();
        t.dueDate = readDate("  Due date YYYY-MM-DD (blank for none): ");
        t.completed = false;
        tasks.push_back(t);
        save();
        cout << "\n  Task added successfully! (ID: " << t.id << ")\n";
    }

    void viewAll() const {
        cout << "\n--- All Tasks ---";
        vector<const Task *> list;
        for (size_t i = 0; i < tasks.size(); i++) list.push_back(&tasks[i]);
        printList(list);
    }

    void viewByStatus(bool completed) const {
        cout << (completed ? "\n--- Completed Tasks ---" : "\n--- Pending Tasks ---");
        vector<const Task *> list;
        for (size_t i = 0; i < tasks.size(); i++)
            if (tasks[i].completed == completed) list.push_back(&tasks[i]);
        printList(list);
    }

    void viewDetails() const {
        if (tasks.empty()) { cout << "\n  No tasks yet.\n"; return; }
        int id = readInt("\n  Enter task ID: ", 1, 1000000);
        int idx = findIndexById(id);
        if (idx < 0) { cout << "  Task not found.\n"; return; }
        const Task &t = tasks[idx];
        cout << "\n  ID          : " << t.id
             << "\n  Title       : " << t.title
             << "\n  Description : " << (t.description.empty() ? "-" : t.description)
             << "\n  Priority    : " << priorityToString(t.priority)
             << "\n  Due Date    : " << (t.dueDate.empty() ? "-" : t.dueDate)
             << "\n  Status      : " << (t.completed ? "Completed" : (isOverdue(t) ? "OVERDUE" : "Pending"))
             << "\n";
    }

    void markComplete() {
        if (tasks.empty()) { cout << "\n  No tasks yet.\n"; return; }
        int id = readInt("\n  Enter ID of task to mark complete: ", 1, 1000000);
        int idx = findIndexById(id);
        if (idx < 0) { cout << "  Task not found.\n"; return; }
        if (tasks[idx].completed) { cout << "  Task is already completed.\n"; return; }
        tasks[idx].completed = true;
        save();
        cout << "  Task marked as completed. Well done!\n";
    }

    void editTask() {
        if (tasks.empty()) { cout << "\n  No tasks yet.\n"; return; }
        int id = readInt("\n  Enter ID of task to edit: ", 1, 1000000);
        int idx = findIndexById(id);
        if (idx < 0) { cout << "  Task not found.\n"; return; }

        Task &t = tasks[idx];
        cout << "  (Press Enter to keep the current value)\n";

        string s = readLine("  Title [" + t.title + "]: ");
        if (!s.empty()) t.title = sanitize(s);

        s = readLine("  Description [" + (t.description.empty() ? string("-") : t.description) + "]: ");
        if (!s.empty()) t.description = sanitize(s);

        s = readLine("  Change priority? (y/n) [" + priorityToString(t.priority) + "]: ");
        if (s == "y" || s == "Y") t.priority = readPriority();

        s = readLine("  Due date [" + (t.dueDate.empty() ? string("-") : t.dueDate) +
                     "] (YYYY-MM-DD, '-' to clear): ");
        if (s == "-") {
            t.dueDate = "";
        } else if (!s.empty()) {
            while (!isValidDate(s)) {
                cout << "  Invalid date. Use YYYY-MM-DD (or press Enter to keep current).\n";
                s = readLine("  Due date: ");
                if (s.empty()) { s = t.dueDate; break; }
            }
            t.dueDate = s;
        }

        save();
        cout << "  Task updated.\n";
    }

    void deleteTask() {
        if (tasks.empty()) { cout << "\n  No tasks yet.\n"; return; }
        int id = readInt("\n  Enter ID of task to delete: ", 1, 1000000);
        int idx = findIndexById(id);
        if (idx < 0) { cout << "  Task not found.\n"; return; }

        string confirm = readLine("  Delete \"" + tasks[idx].title + "\"? (y/n): ");
        if (confirm == "y" || confirm == "Y") {
            tasks.erase(tasks.begin() + idx);
            save();
            cout << "  Task deleted.\n";
        } else {
            cout << "  Cancelled.\n";
        }
    }

    void searchTasks() const {
        string key = toLower(readLine("\n  Enter keyword to search: "));
        if (key.empty()) return;
        vector<const Task *> list;
        for (size_t i = 0; i < tasks.size(); i++)
            if (toLower(tasks[i].title).find(key) != string::npos ||
                toLower(tasks[i].description).find(key) != string::npos)
                list.push_back(&tasks[i]);
        cout << "\n--- Search Results ---";
        printList(list);
    }

    void sortAndView() const {
        if (tasks.empty()) { cout << "\n  No tasks yet.\n"; return; }
        cout << "\n  Sort by: 1) Priority (high first)   2) Due date (earliest first)\n";
        int choice = readInt("  Choose (1-2): ", 1, 2);

        vector<const Task *> list;
        for (size_t i = 0; i < tasks.size(); i++) list.push_back(&tasks[i]);

        if (choice == 1) {
            stable_sort(list.begin(), list.end(),
                        [](const Task *a, const Task *b) { return a->priority > b->priority; });
        } else {
            // tasks without a due date go to the end
            stable_sort(list.begin(), list.end(), [](const Task *a, const Task *b) {
                if (a->dueDate.empty()) return false;
                if (b->dueDate.empty()) return true;
                return a->dueDate < b->dueDate;
            });
        }
        cout << "\n--- Sorted Tasks ---";
        printList(list);
    }

    void showStatistics() const {
        int total = static_cast<int>(tasks.size());
        int done = 0, overdue = 0, high = 0;
        for (size_t i = 0; i < tasks.size(); i++) {
            const Task &t = tasks[i];
            if (t.completed) done++;
            if (isOverdue(t)) overdue++;
            if (!t.completed && t.priority == HIGH) high++;
        }
        int pending = total - done;
        double pct = total ? (done * 100.0 / total) : 0.0;

        cout << "\n--- Statistics ---"
             << "\n  Total tasks         : " << total
             << "\n  Completed           : " << done
             << "\n  Pending             : " << pending
             << "\n  Overdue             : " << overdue
             << "\n  High-priority open  : " << high
             << "\n  Completion rate     : " << fixed << setprecision(1) << pct << "%\n";
    }
};

// ---------------------- Menu & Main ----------------------

void showMenu() {
    cout << "\n==========================================\n"
         << "        TO-DO LIST MANAGEMENT SYSTEM\n"
         << "        Today: " << todayDate() << "\n"
         << "==========================================\n"
         << "  1.  Add task\n"
         << "  2.  View all tasks\n"
         << "  3.  View pending tasks\n"
         << "  4.  View completed tasks\n"
         << "  5.  View task details\n"
         << "  6.  Mark task as completed\n"
         << "  7.  Edit task\n"
         << "  8.  Delete task\n"
         << "  9.  Search tasks\n"
         << "  10. Sort tasks\n"
         << "  11. Statistics\n"
         << "  0.  Exit\n"
         << "------------------------------------------\n";
}

int main() {
    ToDoManager manager("tasks.txt");
    int choice;

    do {
        showMenu();
        choice = readInt("Enter your choice: ", 0, 11);

        switch (choice) {
            case 1:  manager.addTask();            break;
            case 2:  manager.viewAll();            break;
            case 3:  manager.viewByStatus(false);  break;
            case 4:  manager.viewByStatus(true);   break;
            case 5:  manager.viewDetails();        break;
            case 6:  manager.markComplete();       break;
            case 7:  manager.editTask();           break;
            case 8:  manager.deleteTask();         break;
            case 9:  manager.searchTasks();        break;
            case 10: manager.sortAndView();        break;
            case 11: manager.showStatistics();     break;
            case 0:  cout << "\n  Tasks saved. Goodbye!\n"; break;
        }
    } while (choice != 0);

    return 0;
}
