
import 'package:flutter/material.dart';
import 'package:taxi/screens/driver_home.dart';
import 'package:taxi/screens/passenger_home.dart';
import 'package:taxi/screens/login_screen.dart';
import 'package:taxi/screens/splash_screen.dart';
import 'package:taxi/screens/sign_up_screen.dart';

class Routes {
  static const String splash = '/';
  static const String loginScreen = '/login_screen';
  static const String signUpScreen = '/sign_up_screen';
  static const String driverHome = '/driver_home';
  static const String passengerHome = '/passenger_home';
  static const String requestRide = '/request_ride';
  static const String rideHistory = '/ride_history';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => SplashScreen());
      case loginScreen:
        return MaterialPageRoute(builder: (_) => LoginScreen());
      case driverHome:
        return MaterialPageRoute(builder: (_) => DriverHomeScreen());
      case passengerHome:
        return MaterialPageRoute(builder: (_) => PassengerHomeScreen());
      case signUpScreen:
        return MaterialPageRoute(builder: (_) => SignUpScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
        );
    }
  }
}
