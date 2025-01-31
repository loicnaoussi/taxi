
import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF007AFF);
  static const Color buttonColor = Color(0xFF007AFF);

  static final ThemeData lightTheme = ThemeData(
    primaryColor: primaryColor,
    appBarTheme: AppBarTheme(
      backgroundColor: primaryColor,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: buttonColor, // Utiliser backgroundColor au lieu de primary
        textStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    ),
  );
}