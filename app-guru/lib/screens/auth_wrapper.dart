import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';
import 'main_layout.dart';

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 500),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: child,
      ),
      child: authProvider.isLoading
          ? const Scaffold(
              key: ValueKey('loading'),
              body: Center(
                child: SizedBox(
                   width: 40,
                   height: 40,
                   child: CircularProgressIndicator(strokeWidth: 3),
                ),
              ),
            )
          : authProvider.isAuthenticated
              ? const MainLayout(key: ValueKey('home'))
              : const LoginScreen(key: ValueKey('login')),
    );
  }
}
